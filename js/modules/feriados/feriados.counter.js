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

        // Agrupar por Lote (Created_at) - Cada lote conta como 1 única notificação
        const batches = new Set();
        activeItems.forEach(f => {
            const batchKey = f.created_at || f.id;
            batches.add(batchKey);
        });

        return batches.size;
    }
};
