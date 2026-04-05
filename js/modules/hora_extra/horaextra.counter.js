/**
 * HoraExtra.Counter - ChronoSync Module
 * Lógica de contagem para o badge do Diário (Regra 24h).
 */
export const HoraExtraCounter = {
    /**
     * Conta quantas solicitações de hora extra não lidas existem nas últimas 24h
     * @param {Array} items Lista de comunicados do tipo hora_extra
     * @returns {number}
     */
    count(items) {
        if (!items || !Array.isArray(items)) return 0;
        
        const now = new Date();
        const activeItems = items.filter(h => {
            const createdAt = new Date(h.created_at);
            const diffHours = (now - createdAt) / (1000 * 60 * 60);
            
            // Regra: Somente se lido for false (ou nulo) e estiver dentro de 24h
            const isManualSeen = h.lido === true || localStorage.getItem(`ciente_${h.id}`);
            return diffHours < 24 && !isManualSeen;
        });

        return activeItems.length;
    }
};
