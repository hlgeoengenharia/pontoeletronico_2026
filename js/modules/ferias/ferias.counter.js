import { AwarenessManager } from '../../core/awareness.manager.js';

/**
 * Ferias Counter Module - ChronoSync Core
 * Gerencia a contagem de notificações e badges de férias.
 */
export const FeriasCounter = {
    /**
     * Conta quantos cronogramas de férias analisados (Aprovado/Rejeitado) o funcionário não viu.
     */
    count(data = []) {
        if (!data || !Array.isArray(data)) return 0;
        
        const novidades = data.filter(item => {
            const status = (item.status || 'pendente').toLowerCase();
            if (status === 'pendente') return false;
            
            // Verifica via AwarenessManager (Central)
            const isVisto = AwarenessManager.isSeen(item.id);
            return !isVisto;
        });

        return novidades.length > 0 ? 1 : 0;
    },

    /**
     * Conta férias pendentes para o badge do gestor (Administrativo).
     */
    countPendingForManagement(data = []) {
        if (!data || !Array.isArray(data)) return 0;
        
        // Agrupar por funcionário para contar 'cronogramas' pendentes, não parcelas individuais
        const employeesWithPending = new Set(
            data.filter(f => f.status === 'pendente').map(f => f.funcionario_id)
        );
        
        return employeesWithPending.size;
    }
};
