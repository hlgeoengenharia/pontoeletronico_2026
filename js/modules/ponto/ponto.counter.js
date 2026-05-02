
import { AwarenessManager } from '../../core/awareness.manager.js';

/**
 * Ponto Counter Module - ChronoSync Core
 * Gerencia a contagem de notificações relacionadas a pontos (GPS, batidas).
 */
export const PontoCounter = {
    /**
     * Conta pendências de ponto para o Diário do funcionário.
     * Geralmente notificações de sistema sobre pontos alterados.
     */
    count(data = []) {
        if (!data || !Array.isArray(data)) return 0;
        
        // No diário do funcionário, contamos apenas logs de comunicação (que usam status_pendencia).
        // REGRA: Pontos brutos pendentes (status_validacao) NÃO geram notificação pro colaborador, ele aguarda análise.
        return data.filter(item => {
            if (item.status_validacao) return false; // Ignora tabela 'pontos'.
            const isPendente = (item.status_pendencia === 'pendente');
            return isPendente && !AwarenessManager.isSeen(item.id);
        }).length;
    },

    /**
     * Conta alertas de GPS pendentes para o SINO (Visão do Gestor).
     */
    countPendingForSino(data = []) {
        if (!data || !Array.isArray(data)) return 0;
        // Alertas de geofence que precisam de aprovação (status_validacao = pendente)
        return data.filter(item => item.tipo === 'check-out' && item.status_validacao === 'pendente').length;
    }
};
