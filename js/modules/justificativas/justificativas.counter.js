import { AwarenessManager } from '../../core/awareness.manager.js';

/**
 * Justificativas Counter Module - ChronoSync Core
 * Gerencia a contagem de notificações e badges de justificativas.
 */
export const JustificativasCounter = {
    /**
     * Conta quantas justificativas processadas (Aprovado/Rejeitado) o funcionário não viu.
     * Regra: Se o status não for 'pendente', conta como uma novidade no Diário até que
     * o funcionário abra o diário e 'limpe' (marcar como visto).
     */
    count(data = []) {
        if (!data || !Array.isArray(data)) return 0;
        
        return data.filter(item => {
            const status = (item.status || 'pendente').toLowerCase();
            
            // Pendente não é novidade de diário para funcionário. 
            // Só contamos como 'novidade' o que já foi analisado pela gestão (abonado/rejeitado).
            if (status === 'pendente') return false; 
            
            // Verifica se o funcionário já viu esta análise específica via serviço centralizado
            return !AwarenessManager.isSeen(item.id);
        }).length;
    },

    /**
     * Conta justificativas pendentes para o SINO (Visão do Gestor).
     */
    countPendingForSino(data = []) {
        if (!data || !Array.isArray(data)) return 0;
        return data.filter(item => (item.status || 'pendente').toLowerCase() === 'pendente').length;
    }
};
