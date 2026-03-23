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
        console.log('[GPSTracker] Iniciando rastreamento para:', user?.nome_completo);
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

            // 2. Log de Pulso (Com Timestamp)
            const pulseMsg = `Localização registrada automaticamente pelo sistema às ${nowTime} para validar sua presença em serviço durante a jornada.`;
            await this.logOccurrence(user.id, 'gps_pulse', pulseMsg, coordStr);
            console.log(`[GPSTracker] Pulso de GPS enviado (${nowTime}) para funcionario_id: ${user.id}`);
            
            // 3. Rastreamento Externo (Hora em Hora)
            if (user.modalidade === 'Externo') {
                await this.logHourlyLocation(user.id, coordStr);
            } 
            // 4. Geofence (Presencial / Híbrido)
            else if (['Presencial', 'Híbrido'].includes(user.modalidade)) {
                 if (user.setores && user.setores.latitude && user.setores.longitude) {
                     const distance = ScalesEngine.calculateDistance(
                         lat, lng, 
                         user.setores.latitude, user.setores.longitude
                     );
                     const raio = user.escalas?.raio_geofence_metros || 100;
                     const isInside = distance <= raio;
                     const currentStatus = isInside ? 'inside' : 'outside';

                     if (this.lastGeofenceStatus !== null && this.lastGeofenceStatus !== currentStatus) {
                         // Quebra de Perímetro Detectada
                         const msg = currentStatus === 'outside' 
                            ? `O sistema detectou às ${nowTime} que você se ausentou do raio de alcance permitido para o seu local de escala.` 
                            : `O sistema detectou às ${nowTime} o seu retorno para dentro do raio de alcance permitido do seu local de escala.`;
                         await this.logOccurrence(user.id, currentStatus === 'outside' ? 'geofence_out' : 'geofence_in', msg, coordStr);
                     }
                     
                     this.lastGeofenceStatus = currentStatus;
                 }
            }
        } catch (e) {
            console.error('[GPSTracker] Falha ao verificar localização em background', e);
        }
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

        await this.logOccurrence(userId, 'gps_hora', 'Registro automático de localização para fins de auditoria em jornada de trabalho sob regime externo.', coordStr);
    }

    static async logOccurrence(userId, type, message, coords) {
        const payload = {
            funcionario_id: userId,
            data_hora: new Date().toISOString(),
            tipo: type,
            mensagem_padrao: message,
            coordenadas: coords,
            lido_pelo_funcionario: false,
            status_pendencia: 'pendente'
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
