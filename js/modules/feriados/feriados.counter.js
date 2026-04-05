import { AwarenessManager } from '../../core/awareness.manager.js';

/**
 * Feriados.Counter - ChronoSync Module
 * Lógica de contagem para o badge do Diário.
 */
export const FeriadosCounter = {
    /**
     * Conta quantos feriados/folgas o funcionário ainda não viu
     * @param {Array} items Lista de itens vindos do banco
     * @returns {number}
     */
    count(items) {
        if (!items || !Array.isArray(items)) return 0;
        
        const now = new Date();
        const activeItems = items.filter(f => {
            const date = new Date(f.data);
            
            // Regra: Somente se for hoje ou futuro
            const isFutureOrToday = date >= now.setHours(0,0,0,0);
            
            // Verifica se foi visto via AwarenessManager
            const isManualSeen = AwarenessManager.isSeen(f.id);
            
            return isFutureOrToday && !isManualSeen;
        });

        // Agrupar por Lote (Created_at) - Fundamental para contagem de EVENTO ÚNICO
        const batches = new Set();
        activeItems.forEach(f => {
            // Se tiver created_at, usa como chave de lote, senão usa o ID próprio
            const batchKey = f.created_at || f.id;
            batches.add(batchKey);
        });

        // Se o lote já foi visto (via o ID de qualquer item do lote), não conta
        // Como o Agregador envia a lista bruta, filtramos aqui
        let finalCount = 0;
        batches.forEach(key => {
            // Procuramos se algum item desse lote NUNCA foi visto
            const someUnseenInBatch = activeItems.some(f => (f.created_at === key || f.id === key) && !AwarenessManager.isSeen(f.id));
            if (someUnseenInBatch) finalCount++;
        });

        return finalCount;
    }
};
