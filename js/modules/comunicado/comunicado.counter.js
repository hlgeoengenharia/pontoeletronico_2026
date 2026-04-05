import { AwarenessManager } from '../../core/awareness.manager.js';

/**
 * Comunicado.Counter - ChronoSync Module
 * Lógica de contagem para o badge do Diário (Regra 24h).
 */
export const ComunicadoCounter = {
    /**
     * Conta quantos comunicados não lidos existem nas últimas 24h
     * @param {Array} items Lista de comunicados vindos do banco
     * @returns {number}
     */
    count(items) {
        if (!items || !Array.isArray(items)) return 0;
        
        const now = new Date();
        const activeItems = items.filter(c => {
            const createdAt = new Date(c.created_at);
            const diffHours = (now - createdAt) / (1000 * 60 * 60);
            
            // Regra: Somente se lido for false (ou nulo) e estiver dentro de 24h
            // E não ter sido visto pelo tripulante via AwarenessManager
            const isManualSeen = c.lido === true || AwarenessManager.isSeen(c.id);
            return diffHours < 24 && !isManualSeen;
        });

        return activeItems.length;
    }
};
