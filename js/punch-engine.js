import { supabase } from './supabase-config.js';
import { EventManager } from './event-manager.js';
import { ScalesEngine } from './scales-engine.js';

/**
 * PunchEngine V3.0 - ChronoSync
 * Novo motor isolado para registro de ponto, biometria e geofence.
 * Reconstruído do zero para garantir estabilidade e eliminar loops.
 */
export const PunchEngine = {
    isProcessing: false,
    tempData: {
        type: null,
        lat: null,
        lng: null,
        accuracy: 0,
        gpsOculto: false,
        justificativa: null
    },

    /**
     * Inicia o fluxo de batida de ponto
     */
    async startFlow(type, currentUser) {
        if (this.isProcessing || document.hidden) return;
        this.isProcessing = true;
        this.tempData.type = type;
        
        UI.showLoader();
        console.log(`[PunchEngine] Iniciando fluxo para: ${type}`);

        try {
            // 1. Obter Localização (Mandatório para validação, Opcional para registro)
            await this.captureGPS(currentUser.escalas);

            // 2. Fluxo de Biometria (se ativa)
            if (currentUser.biometria_cadastrada) {
                await this.openBiometriaModal();
            } else {
                await this.checkGeofenceAndCommit(currentUser);
            }
        } catch (err) {
            console.error('[PunchEngine] Falha no fluxo inicial:', err);
            UI.showToast('Erro ao iniciar registro de ponto.', 'error');
            this.reset();
        } finally {
            UI.hideLoader();
        }
    },

    /**
     * Captura coordenadas GPS e trata permissões/erros
     */
    async captureGPS(escala) {
        try {
            if (typeof GPSTracker === 'undefined') throw new Error('GPSTracker não inicializado');
            
            const pos = await GPSTracker.getCurrentPosition();
            this.tempData.lat = pos.coords.latitude;
            this.tempData.lng = pos.coords.longitude;
            this.tempData.accuracy = pos.coords.accuracy;
            this.tempData.gpsOculto = false;
            
            console.log(`[PunchEngine] GPS Capturado: ${this.tempData.lat}, ${this.tempData.lng} (±${Math.round(this.tempData.accuracy)}m)`);
        } catch (e) {
            console.warn('[PunchEngine] Falha no GPS (Modo Oculto):', e);
            this.tempData.gpsOculto = true;
            this.tempData.lat = null;
            this.tempData.lng = null;
            this.tempData.accuracy = 0;
        }
    },

    /**
     * Abre o modal de Biometria Facial
     */
    async openBiometriaModal() {
        const modal = document.getElementById('modalCamera');
        const video = document.getElementById('video-feed');
        if (!modal || !video) return;

        modal.classList.remove('hidden');
        modal.classList.add('flex');

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: "user", width: 720, height: 720 },
                audio: false
            });
            video.srcObject = stream;
            this.cameraStream = stream;
        } catch (err) {
            console.error("[PunchEngine] Erro ao acessar câmera:", err);
            UI.showToast("Falha ao acessar câmera frontal.", "error");
            this.closeBiometriaModal();
            this.reset();
        }
    },

    closeBiometriaModal() {
        const modal = document.getElementById('modalCamera');
        if (this.cameraStream) {
            this.cameraStream.getTracks().forEach(track => track.stop());
            this.cameraStream = null;
        }
        if (modal) {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        }
    },

    /**
     * Captura a foto e prossegue para Geofence
     */
    async captureAndProcess(currentUser) {
        const video = document.getElementById('video-feed');
        const canvas = document.getElementById('canvas-snapshot');
        if (!video || !canvas) return;

        UI.showLoader();
        try {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            canvas.getContext('2d').drawImage(video, 0, 0);
            
            // Nota: Não salvamos a imagem no banco por privacidade/performance
            this.closeBiometriaModal();
            await this.checkGeofenceAndCommit(currentUser);
        } catch (err) {
            console.error('[PunchEngine] Erro na captura de face:', err);
            UI.showToast('Erro ao processar imagem.', 'error');
            this.reset();
        } finally {
            UI.hideLoader();
        }
    },

    /**
     * Valida geofence e decide se abre modal de justificativa ou grava direto
     */
    async checkGeofenceAndCommit(currentUser) {
        const escala = currentUser.escalas;
        
        // Se houver escala, validamos o Geofence
        if (escala) {
            const validation = EventManager.validatePointEvent({
                tipo: this.tempData.type,
                latitude: this.tempData.lat,
                longitude: this.tempData.lng,
                accuracy: this.tempData.accuracy
            }, escala);

            // Se estiver fora do raio, abre modal de justificativa
            if (validation.status === 'divergente' && validation.alerts.includes('FORA DO RAIO')) {
                this.openGeofenceModal(currentUser, validation.distancia_metros, validation.raio_permitido);
                return;
            }
        }

        // Se estiver dentro do raio ou sem escala, grava direto
        await this.commitToDatabase(currentUser);
    },

    /**
     * Abre o modal de justificativa de Geofence
     */
    openGeofenceModal(currentUser, distancia, raio) {
        const modal = document.getElementById('modalJustificativa');
        const title = document.getElementById('geofenceTitle');
        const instruction = document.getElementById('geofenceInstruction');
        const btnConfirmar = document.getElementById('btnConfirmarPontoForaRaio');
        const containerDistancia = document.getElementById('geofenceDistanceInfo'); // Novo elemento esperado no HTML
        
        if (!modal) return;

        const isHardLocked = (distancia > 5000); // Limite de 5km para bloqueio total

        if (title) title.innerText = isHardLocked ? `DISTÂNCIA EXCESSIVA (${Math.round(distancia/1000)}KM)` : `SOLICITAÇÃO DE ${this.tempData.type.toUpperCase()} FORA DO RAIO`;
        
        if (instruction) {
            instruction.innerHTML = isHardLocked ? 
                `<span class="text-rose-500 font-bold">REGISTRO BLOQUEADO.</span><br>Sua distância de <b class="text-rose-500">${Math.round(distancia/1000)}km</b> supera o limite máximo de segurança para batida de ponto remota.` : 
                `Você está a <b class="text-amber-500">${distancia} metros</b> do perímetro estabelecido (${raio}m). Justifique sua localização para prosseguir.`;
        }

        // Exibir distância no contêiner info se disponível
        if (containerDistancia) {
            containerDistancia.innerHTML = `Distância Detectada: <b>${distancia >= 1000 ? (distancia/1000).toFixed(1)+'km' : distancia+'m'}</b>`;
            containerDistancia.classList.remove('hidden');
        }

        if (btnConfirmar) {
            btnConfirmar.disabled = isHardLocked;
            btnCronStyle = isHardLocked ? 'bg-slate-700 cursor-not-allowed opacity-50' : 'bg-primary';
            btnConfirmar.className = `w-full py-4 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${btnCronStyle}`;
        }

        modal.classList.remove('hidden');
        modal.classList.add('flex');

        // Configurar botões do modal
        if (btnConfirmar) {
            btnConfirmar.onclick = async () => {
                if (isHardLocked) return;
                const rawText = document.getElementById('justificativaTexto').value || '';
                this.tempData.justificativa = rawText.trim() || `Divergência de geofence via ${this.tempData.type} aceita sem comentário detalhado. [Distância: ${distancia}m]`;
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
    },

    /**
     * Persistência final no banco de dados
     */
    async commitToDatabase(currentUser) {
        if (!this.tempData.type) return;
        UI.showLoader();

        try {
            const userId = currentUser.id || localStorage.getItem('userId');
            const escala = currentUser.escalas;

            // 1. Validação Final de Alertas para o Banco
            const validation = escala ? EventManager.validatePointEvent({
                tipo: this.tempData.type,
                latitude: this.tempData.lat,
                longitude: this.tempData.lng,
                accuracy: this.tempData.accuracy
            }, escala) : { status: 'normal', alerts: [] };

            if (this.tempData.gpsOculto) validation.alerts.push("GPS Oculto/Desligado");
            
            const isDivergent = this.tempData.gpsOculto || validation.status === 'divergente' || (validation.alerts && validation.alerts.length > 0);

            // 2. Inserção na Tabela 'pontos'
            const now = new Date();
            
            // Lógica de Identificação de Hora Extra Ativa (ChronoSync Core)
            let extraNote = '';
            if (this.activeExtraMinutes > 0) {
                extraNote = ` [EXPEDIENTE PRORROGADO: +${this.activeExtraMinutes} MIN AUTORIZADOS]`;
            }

            const { error } = await supabase.from('pontos').insert([{
                funcionario_id: userId,
                data_hora: now.toISOString(),
                tipo: this.tempData.type,
                status_validacao: (this.tempData.justificativa || isDivergent) ? 'pendente' : 'aprovado',
                dentro_do_raio: !validation.alerts.includes('FORA DO RAIO'),
                justificativa_usuario: (this.tempData.justificativa || (validation.alerts.length > 0 ? validation.alerts.join(' | ') : '')) + extraNote,
                latitude: this.tempData.lat,
                longitude: this.tempData.lng
            }]);

            if (error) throw error;

            // 3. Logs Específicos (Saída Antecipada / GPS Oculto)
            await this.processSideEffects(currentUser, isDivergent, validation.alerts);

            UI.showToast('Ponto registrado com sucesso!', 'success');
            
            // 4. Notificar Dashboard (se globalmente disponível)
            if (window.dispatchEvent) {
                window.dispatchEvent(new CustomEvent('punch-success', { detail: { type: this.tempData.type } }));
            }

        } catch (err) {
            console.error('[PunchEngine] Erro ao gravar ponto:', err);
            UI.showToast('Erro ao salvar registro de ponto.', 'error');
        } finally {
            UI.hideLoader();
            this.reset();
        }
    },

    /**
     * Processa efeitos colaterais como logs de saída antecipada
     */
    async processSideEffects(currentUser, isDivergent, alerts) {
        const escala = currentUser.escalas;
        const now = new Date();

        // A. Log de Saída Antecipada (Check-out antes do horário + tolerância)
        if (this.tempData.type === 'check-out' && escala && escala.horario_saida && !isDivergent) {
            const [hS, mS] = escala.horario_saida.split(':').map(Number);
            const scheduledExit = new Date();
            scheduledExit.setHours(hS, mS, 0, 0);

            // Se bateu ponto mais de 10 minutos antes da saída prevista
            if (now < new Date(scheduledExit.getTime() - 10 * 60000)) {
                await supabase.from('diario_logs').insert([{
                    funcionario_id: currentUser.id,
                    data_hora: now.toISOString(),
                    tipo: 'saida_intermediaria',
                    mensagem_padrao: 'Registro de saída antecipada em relação ao horário oficial da escala.',
                    status_pendencia: 'pendente',
                    coordenadas: (this.tempData.lat && this.tempData.lng) ? `${this.tempData.lat},${this.tempData.lng}` : null
                }]);
            }
        }

        // B. Log de GPS Oculto
        if (this.tempData.gpsOculto && !isDivergent) {
            await supabase.from('diario_logs').insert([{
                funcionario_id: currentUser.id,
                data_hora: now.toISOString(),
                tipo: 'gps_oculto',
                mensagem_padrao: `Registro de ${this.tempData.type.toUpperCase()} efetuado sem coordenadas GPS.`,
                status_pendencia: 'pendente'
            }]);
        }
    },

    reset() {
        this.isProcessing = false;
        this.tempData = {
            type: null, lat: null, lng: null, accuracy: 0, gpsOculto: false, justificativa: null
        };
        // Limpar campo de texto do modal se existir
        const input = document.getElementById('justificativaTexto');
        if (input) input.value = '';
    }
};

// Tornar global para acesso via onclick se necessário
window.PunchEngine = PunchEngine;
