/**
 * Sistema de Rastreamento GPS Automático
 * Registra pontos de perímetro e rastreio horário no diario_logs.
 */
import { supabase } from './supabase-config.js';
import { ScalesEngine } from './scales-engine.js';

class GPSTracker {
    static trackingInterval = null;
    static lastGeofenceStatus = null; // 'inside' or 'outside'

    /**
     * Inicia o monitoramento.
     * @param {Object} user 
     */
    static startTracking(user) {
        const displayName = user?.nome_completo || user?.name || user?.nickname || 'Usuário';
        console.log('[GPSTracker] Iniciando rastreamento para:', displayName);
        if (this.trackingInterval) clearInterval(this.trackingInterval);
        this.checkBackgroundLocation(user); // Chamada inicial
        
        // Verifica a cada 15 minutos (para geofencing ser mais ágil, mas poupar bateria)
        this.trackingInterval = setInterval(() => {
            console.log('[GPSTracker] Checkpoint de localização (15min)...');
            this.checkBackgroundLocation(user);
        }, 15 * 60 * 1000); // 15 min
    }

    static stopTracking() {
        if (this.trackingInterval) clearInterval(this.trackingInterval);
    }

    static async checkBackgroundLocation(user) {
        if (!user || !user.id) return;

        try {
            // 1. Verificar se o expediente está ativo (Ponto Aberto)
            const today = new Date().toISOString().split('T')[0];
            const { data: punches, error: punchError } = await supabase
                .from('pontos')
                .select('id')
                .eq('funcionario_id', user.id)
                .gte('data_hora', `${today}T00:00:00`)
                .order('data_hora', { ascending: true });

            if (punchError) throw punchError;

            // Se o número de batidas for par (ou zero), o sistema está em check-in ou encerrou o dia.
            // O rastreio só deve ocorrer se estivermos com o ponto aberto (ímpar).
            const isShiftActive = punches && punches.length % 2 !== 0;

            if (!isShiftActive) {
                console.log('[GPSTracker] Rastreio ignorado: Funcionário fora de expediente (ponto fechado).');
                return;
            }

            const position = await this.getCurrentPosition();
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            const coordStr = `${lat},${lng}`;
            const nowTime = new Date().toLocaleTimeString('pt-BR');

            // 3. Rastreamento Externo (Baseado na Escala)
            const escala = user.escalas || {};
            if (escala.rastreio_horario) {
                await this.logHourlyLocation(user.id, coordStr);
            } 

            // 4. Geofence (Presencial / Híbrido)
            if (['Presencial', 'Híbrido'].includes(user.regime_trabalho)) {
                 if (user.setores && user.setores.latitude && user.setores.longitude) {
                     const distance = ScalesEngine.calculateDistance(
                         lat, lng, 
                         user.setores.latitude, user.setores.longitude
                     );
                     // Usa o raio do setor, ou 100m como fallback
                     const raio = user.setores.raio || 100;
                     const isInside = distance <= raio;
                     const currentStatus = isInside ? 'inside' : 'outside';

                     if (this.lastGeofenceStatus !== null && this.lastGeofenceStatus !== currentStatus) {
                         // Quebra de Perímetro Detectada
                         const isOut = currentStatus === 'outside';
                         const msg = isOut 
                            ? `O sistema detectou que você se ausentou do raio de alcance permitido para o seu local de escala/setor designado.` 
                            : `O sistema detectou o seu retorno para dentro do raio de alcance permitido do seu local de escala/setor designado.`;
                         
                         await this.logOccurrence(
                             user.id, 
                             isOut ? 'geofence_out' : 'geofence_in', 
                             msg, 
                             coordStr, 
                             isOut ? 'pendente' : 'aprovado',
                             isOut ? 'FORA DO RAIO PERMITIDO' : 'RETORNO AO POSTO'
                         );
                     }
                     
                     this.lastGeofenceStatus = currentStatus;
                 }
            }
        } catch (e) {
            console.error('[GPSTracker] Falha ao verificar localização em background', e);
        }
    }

    static async logPulse(userId, coordStr) {
        // Verifica se já teve pulso nos últimos 15 min
        const { data: latestLogs } = await supabase
            .from('diario_logs')
            .select('created_at')
            .eq('funcionario_id', userId)
            .eq('tipo', 'gps_pulse')
            .order('created_at', { ascending: false })
            .limit(1);

        if (latestLogs && latestLogs.length > 0) {
            const lastLog = new Date(latestLogs[0].created_at);
            const now = new Date();
            const diffMin = (now - lastLog) / (1000 * 60);
            if (diffMin < 14) {
                console.log(`[GPSTracker] Pulso ignorado: último registro há ${Math.round(diffMin)} min.`);
                return;
            }
        }

        const msg = `Localização registrada automaticamente pelo sistema para validar sua presença em serviço durante a jornada.`;
        await this.logOccurrence(userId, 'gps_pulse', msg, coordStr, 'aprovado');
        console.log(`[GPSTracker] Pulso de GPS enviado para funcionario_id: ${userId}`);
    }

    static async logHourlyLocation(userId, coordStr) {
        // Verifica se já teve log na última hora
        const { data: latestLogs } = await supabase
            .from('diario_logs')
            .select('created_at')
            .eq('funcionario_id', userId)
            .eq('tipo', 'gps_hora')
            .order('created_at', { ascending: false })
            .limit(1);

        if (latestLogs && latestLogs.length > 0) {
            const lastLog = new Date(latestLogs[0].created_at);
            const now = new Date();
            const diffMin = (now - lastLog) / (1000 * 60);
            if (diffMin < 55) return; // Não faz log se não passou aprox 1 hora
        }

        const msg = 'Registro automático de localização para fins de auditoria em jornada de trabalho sob regime externo.';
        await this.logOccurrence(userId, 'gps_hora', msg, coordStr, 'aprovado');
    }

    static async logOccurrence(userId, type, message, coords, status = 'pendente', typeOriginal = null) {
        const payload = {
            funcionario_id: userId,
            data_hora: new Date().toISOString(),
            tipo: type,
            tipo_original: typeOriginal || type.toUpperCase(),
            mensagem_padrao: message,
            coordenadas: coords,
            lido_pelo_funcionario: false,
            status_pendencia: status
        };
        await supabase.from('diario_logs').insert([payload]);
    }

    static getCurrentPosition() {
        return new Promise((resolve, reject) => {
            if(!navigator.geolocation) return reject('No geolocation');
            navigator.geolocation.getCurrentPosition(resolve, reject, {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            });
        });
    }
}

export { GPSTracker };
