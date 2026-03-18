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
        if (this.trackingInterval) clearInterval(this.trackingInterval);
        this.checkBackgroundLocation(user); // Chamada inicial
        
        // Verifica a cada 15 minutos (para geofencing ser mais ágil, mas poupar bateria)
        // O rastreio "hora a hora" para externos será registrado se já passou de 1 hora
        this.trackingInterval = setInterval(() => {
            this.checkBackgroundLocation(user);
        }, 15 * 60 * 1000); // 15 min
    }

    static stopTracking() {
        if (this.trackingInterval) clearInterval(this.trackingInterval);
    }

    static async checkBackgroundLocation(user) {
        if (!user || (!user.escalas && !user.setores)) return;

        try {
            const position = await this.getCurrentPosition();
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            const coordStr = `${lat},${lng}`;

            // 1. Rastreamento Externo (Hora em Hora)
            if (user.modalidade === 'Externo') {
                await this.logHourlyLocation(user.id, coordStr);
            } 
            // 2. Geofence (Presencial / Híbrido)
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
                         const msg = currentStatus === 'outside' ? 'Funcionário saiu do local de trabalho' : 'Funcionário retornou ao local de trabalho';
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

        await this.logOccurrence(userId, 'gps_hora', 'Log Automático de Rastreio (Regime Externo)', coordStr);
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
