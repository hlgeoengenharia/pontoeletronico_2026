import { supabase } from './supabase-config.js';
import { EventManager } from './event-manager.js';
import { BusinessRulesManager } from './business-rules-manager.js';
import { BiometricHelper } from './biometric-helper.js';

/**
 * PunchEngine V3.1 - fluxo de ponto com biometria fail-closed.
 */
export const PunchEngine = {
    isProcessing: false,
    cameraStream: null,
    activeExtraMinutes: 0,
    tempData: {
        type: null,
        lat: null,
        lng: null,
        accuracy: 0,
        gpsOculto: false,
        justificativa: null,
        biometriaAudit: null,
        foraDoRaioDistancia: null,
        foraDoRaioRaio: null
    },

    async startFlow(type, currentUser) {
        if (this.isProcessing || document.hidden) return;

        this.isProcessing = true;
        this.tempData.type = type;
        this.tempData.biometriaAudit = null;

        UI.showLoader();
        console.log(`[PunchEngine] Iniciando fluxo para: ${type}`);

        try {
            const canProceed = await BusinessRulesManager.checkBiometryPreflight(currentUser);
            if (!canProceed) {
                UI.showToast('Biometria facial obrigatoria. Redirecionando para recadastro.', 'warning');
                setTimeout(() => {
                    window.location.href = `perfil_funcionario.html?action=enroll&id=${currentUser.id || localStorage.getItem('userId')}`;
                }, 1800);
                return;
            }

            await this.captureGPS(currentUser.escalas);
            await this.openBiometriaModal();
        } catch (err) {
            console.error('[PunchEngine] Falha no fluxo inicial:', err);
            UI.showToast('Erro ao iniciar registro de ponto.', 'error');
            this.reset();
        } finally {
            UI.hideLoader();
        }
    },

    async captureGPS() {
        try {
            if (typeof GPSTracker === 'undefined') throw new Error('GPSTracker nao inicializado');

            const pos = await GPSTracker.getCurrentPosition();
            this.tempData.lat = pos.coords.latitude;
            this.tempData.lng = pos.coords.longitude;
            this.tempData.accuracy = pos.coords.accuracy;
            this.tempData.gpsOculto = false;
        } catch (error) {
            console.warn('[PunchEngine] Falha no GPS (modo oculto):', error);
            this.tempData.gpsOculto = true;
            this.tempData.lat = null;
            this.tempData.lng = null;
            this.tempData.accuracy = 0;
        }
    },

    updateCameraStatus(message, tone = 'muted') {
        const statusEl = document.getElementById('camera-status-text');
        if (!statusEl) return;

        statusEl.textContent = message;
        statusEl.classList.remove('text-slate-500', 'text-amber-400', 'text-rose-400', 'text-emerald-400');

        if (tone === 'error') statusEl.classList.add('text-rose-400');
        else if (tone === 'warning') statusEl.classList.add('text-amber-400');
        else if (tone === 'success') statusEl.classList.add('text-emerald-400');
        else statusEl.classList.add('text-slate-500');
    },

    async openBiometriaModal() {
        const modal = document.getElementById('modalCamera');
        const video = document.getElementById('video-feed');
        const captureButton = document.getElementById('btn-capturar-face');
        const retryButton = document.getElementById('btn-tentar-camera');
        if (!modal || !video) throw new Error('Modal de biometria nao encontrado');

        modal.classList.remove('hidden');
        modal.classList.add('flex');
        this.updateCameraStatus('Posicione seu rosto sozinho no centro do visor para validar o ponto.');

        if (captureButton) captureButton.classList.remove('hidden');
        if (retryButton) retryButton.classList.add('hidden');

        this.closeCameraStream();

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: 'user',
                    width: { ideal: 720 },
                    height: { ideal: 720 }
                },
                audio: false
            });

            video.srcObject = stream;
            this.cameraStream = stream;
            this.updateCameraStatus('Capture 3 amostras estaveis com boa iluminacao.', 'success');
        } catch (error) {
            console.error('[PunchEngine] Erro ao acessar camera:', error);

            this.tempData.biometriaAudit = BiometricHelper.buildAudit({
                deviceError: error?.name || 'camera_open_failed'
            });

            this.updateCameraStatus(BiometricHelper.getCameraErrorMessage(error), 'error');
            UI.showToast('Camera indisponivel. Nenhum ponto foi registrado.', 'error');

            if (captureButton) captureButton.classList.add('hidden');
            if (retryButton) retryButton.classList.remove('hidden');
        }
    },

    closeCameraStream() {
        if (this.cameraStream) {
            this.cameraStream.getTracks().forEach(track => track.stop());
            this.cameraStream = null;
        }
    },

    closeBiometriaModal(resetFlow = false) {
        const modal = document.getElementById('modalCamera');
        this.closeCameraStream();

        if (modal) {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        }

        if (resetFlow) {
            this.reset();
        }
    },

    async captureAndProcess(currentUser) {
        const video = document.getElementById('video-feed');
        const canvas = document.getElementById('canvas-snapshot');
        if (!video || !canvas) return;

        UI.showLoader();
        this.updateCameraStatus('Validando identidade facial. Aguarde...', 'warning');

        try {
            const remoteTemplate = await BiometricHelper.fetchTemplateForUser(currentUser.id || localStorage.getItem('userId'));
            if (!remoteTemplate.user?.biometria_cadastrada) {
                throw new Error('Biometria nao cadastrada. Atualize seu perfil primeiro.');
            }

            if (!remoteTemplate.parsedTemplate.valid) {
                throw new Error('Seu template biometrico esta invalido ou legado. Refaça o cadastro facial no perfil.');
            }

            canvas.width = video.videoWidth || 720;
            canvas.height = video.videoHeight || 720;
            canvas.getContext('2d').drawImage(video, 0, 0);

            const { FaceApiService } = await import('./face-api-service.js');
            await FaceApiService.init();

            const verification = await FaceApiService.verifyLiveMatch(video, remoteTemplate.parsedTemplate.descriptor, {
                samples: 3,
                threshold: 0.55,
                minScore: 0.4,
                maxRetries: 5
            });

            if (!verification.isMatch) {
                throw new Error('Rosto nao reconhecido. Apenas a face cadastrada neste perfil pode bater o ponto.');
            }

            this.tempData.biometriaAudit = BiometricHelper.buildAudit({
                score: verification.averageConfidence,
                method: 'face-api',
                threshold: verification.threshold,
                sampleCount: verification.sampleCount,
                tokenFormat: remoteTemplate.parsedTemplate.format
            });

            this.updateCameraStatus('Identidade confirmada. Finalizando registro...', 'success');
            this.closeBiometriaModal(false);
            await this.checkGeofenceAndCommit(currentUser);
        } catch (error) {
            console.error('[PunchEngine] Erro na captura de face:', error);
            UI.showToast(error.message || 'Erro ao processar imagem.', 'error');
            this.updateCameraStatus(error.message || 'Falha na verificacao facial.', 'error');
            this.closeBiometriaModal(true);
        } finally {
            UI.hideLoader();
        }
    },

    async checkGeofenceAndCommit(currentUser) {
        const escala = currentUser.escalas;
        
        console.log('[PunchEngine] checkGeofenceAndCommit:', { 
            hasEscala: !!escala, 
            escalaKeys: escala ? Object.keys(escala) : [],
            escalaLat: escala?.lat, 
            escalaLng: escala?.lng,
            scaleRaio: escala?.raio_geofence,
            escalaId: escala?.id,
            lat: this.tempData.lat,
            lng: this.tempData.lng,
            accuracy: this.tempData.accuracy
        });

        if (escala) {
            const setor = currentUser.setores;
            const validation = EventManager.validatePointEvent({
                tipo: this.tempData.type,
                latitude: this.tempData.lat,
                longitude: this.tempData.lng,
                accuracy: this.tempData.accuracy
            }, escala, setor);

            console.log('[PunchEngine] validation:', validation);

            if (validation.status === 'divergente' && validation.alerts.includes('FORA DO RAIO')) {
                this.tempData.foraDoRaioDistancia = validation.distancia_metros;
                this.tempData.foraDoRaioRaio = validation.raio_permitido;
                this.openGeofenceModal(currentUser, validation.distancia_metros, validation.raio_permitido);
                return;
            }
        }

        await this.commitToDatabase(currentUser);
    },

    openGeofenceModal(currentUser, distancia, raio) {
        const modal = document.getElementById('modalJustificativa');
        const title = document.getElementById('geofenceTitle');
        const instruction = document.getElementById('geofenceInstruction');
        const btnConfirmar = document.getElementById('btnConfirmarPontoForaRaio');
        const containerDistancia = document.getElementById('geofenceDistanceInfo');

        if (!modal) return;

        const isCheckin = this.tempData.type === 'check-in';
        if (title) title.innerText = isCheckin ? 'CHECKIN REALIZADO FORA DO RAIO DE TRABALHO' : 'CHECKOUT REALIZADO FORA DO RAIO DE TRABALHO';
        if (instruction) instruction.innerHTML = 'Detectamos que voce esta fora do raio de trabalho permitido.<br><br><b>Justificativa (Opcional):</b>';

        if (containerDistancia) {
            containerDistancia.innerHTML = `Localizacao atual: <b>${distancia >= 1000 ? `${(distancia / 1000).toFixed(1)}km` : `${distancia}m`} de distancia</b> | Raio permitido: <b>${raio}m</b>`;
            containerDistancia.classList.remove('hidden');
        }

        if (btnConfirmar) {
            btnConfirmar.disabled = false;
            btnConfirmar.className = 'w-full py-4 bg-primary text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all hover:bg-primary/80 active:scale-95 shadow-lg shadow-primary/20';
            btnConfirmar.onclick = async () => {
                if (typeof isHardLocked !== 'undefined' && isHardLocked) return;
                const rawText = document.getElementById('justificativaTexto').value || '';
                this.tempData.justificativa = rawText.trim() || `Divergencia de geofence via ${this.tempData.type} aceita sem comentario detalhado. [Distancia: ${distancia}m]`;
                modal.classList.add('hidden');
                await this.commitToDatabase(currentUser);
            };
        }

        const btnFechar = document.getElementById('btnFecharModal');
        if (btnFechar) {
            btnFechar.onclick = () => {
                modal.classList.add('hidden');
                this.reset();
            };
        }

        modal.classList.remove('hidden');
        modal.classList.add('flex');
    },

    async commitToDatabase(currentUser) {
        if (!this.tempData.type) return;
        if (!this.tempData.biometriaAudit?.biometria_verificada) {
            UI.showToast('A validacao facial e obrigatoria para concluir o ponto.', 'error');
            this.reset();
            return;
        }

        UI.showLoader();

        try {
            const userId = currentUser.id || localStorage.getItem('userId');
            const escala = currentUser.escalas;

            const setor = currentUser.setores;
            const validation = escala ? EventManager.validatePointEvent({
                tipo: this.tempData.type,
                latitude: this.tempData.lat,
                longitude: this.tempData.lng,
                accuracy: this.tempData.accuracy
            }, escala, setor) : { status: 'normal', alerts: [] };

            if (this.tempData.gpsOculto) validation.alerts.push('GPS Oculto/Desligado');

            const isDivergent = this.tempData.gpsOculto || this.tempData.foraDoRaioDistancia != null || validation.status === 'divergente' || (validation.alerts && validation.alerts.length > 0);
            const now = new Date();
            let extraNote = '';
            if (this.activeExtraMinutes > 0) {
                extraNote = ` [EXPEDIENTE PRORROGADO: +${this.activeExtraMinutes} MIN AUTORIZADOS]`;
            }

            const isForaDoRaio = this.tempData.foraDoRaioDistancia != null || validation.alerts.includes('FORA DO RAIO');
            const distancia_m = this.tempData.foraDoRaioDistancia ?? validation.distancia_metros;

            console.log('[PunchEngine] Commit:', { isDivergent, isForaDoRaio, distancia_m, foraDoRaioDistancia: this.tempData.foraDoRaioDistancia, validationAlerts: validation.alerts });

            const payload = {
                funcionario_id: userId,
                data_hora: now.toISOString(),
                tipo: this.tempData.type,
                status_validacao: isForaDoRaio ? 'pendente' : 'aprovado',
                dentro_do_raio: !isForaDoRaio,
                justificativa_usuario: (this.tempData.justificativa || (validation.alerts.length > 0 ? validation.alerts.join(' | ') : '')) + extraNote,
                latitude: this.tempData.lat,
                longitude: this.tempData.lng,
                biometria_verificada: true,
                biometria_score: this.tempData.biometriaAudit.biometria_score,
                biometria_metodo: this.tempData.biometriaAudit.biometria_metodo,
                biometria_timestamp: this.tempData.biometriaAudit.biometria_timestamp,
                biometria_device_error: this.tempData.biometriaAudit.biometria_device_error || null
            };

            const { error } = await supabase.from('pontos').insert([payload]);
            if (error) throw error;

            await this.processSideEffects(currentUser, isDivergent, isForaDoRaio, distancia_m);

            UI.showToast('Ponto registrado com sucesso!', 'success');
            if (window.dispatchEvent) {
                window.dispatchEvent(new CustomEvent('punch-success', { detail: { type: this.tempData.type } }));
            }
        } catch (error) {
            console.error('[PunchEngine] Erro ao gravar ponto:', error);
            UI.showToast('Erro ao salvar registro de ponto.', 'error');
        } finally {
            UI.hideLoader();
            this.reset();
        }
    },

    async processSideEffects(currentUser, isDivergent, isForaDoRaio = false, distancia = null) {
        const now = new Date();

        console.log('[PunchEngine] processSideEffects:', { isDivergent, isForaDoRaio, distancia, type: this.tempData.type });

        if (isDivergent && isForaDoRaio) {
            const { data, error } = await supabase.from('diario_logs').insert([{
                funcionario_id: currentUser.id,
                data_hora: now.toISOString(),
                tipo: 'pendencia_geofence',
                mensagem_padrao: `Registro de ${this.tempData.type.toUpperCase()} efetuado fora do raio permitido (${distancia || '?'}m).`,
                status_pendencia: 'pendente'
            }]);
            if (error) {
                console.error('[PunchEngine] Erro ao criar pendência:', error);
            } else {
                console.log('[PunchEngine] Pendência criada:', data);
            }
        }
    },

    retryCamera() {
        this.openBiometriaModal();
    },

    reset() {
        this.isProcessing = false;
        this.closeCameraStream();
        this.tempData = {
            type: null,
            lat: null,
            lng: null,
            accuracy: 0,
            gpsOculto: false,
            justificativa: null,
            biometriaAudit: null,
            foraDoRaioDistancia: null,
            foraDoRaioRaio: null
        };

        const input = document.getElementById('justificativaTexto');
        if (input) input.value = '';
        this.updateCameraStatus('Posicione seu rosto sozinho no centro do visor para validar o ponto.');
    }
};

window.PunchEngine = PunchEngine;
