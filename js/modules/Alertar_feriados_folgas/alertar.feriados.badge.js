/**
 * AlertarFeriadosBadge - ChronoSync
 * Provedor de contagem para o badge do Sino (Notificações Admin).
 */
export const AlertarFeriadosBadge = {
    /**
     * Conta quantos alertas mensais estão pendentes
     */
    count(data) {
        if (!data || !Array.isArray(data)) return 0;
        
        // No contexto do Sino para Admin, filtramos apenas os logs pendentes deste tipo específico
        return data.filter(item => {
            const isTargetType = item.tipo === 'alerta_feriados_folgas';
            const isPendente = (item.status_pendencia || 'pendente').toLowerCase() === 'pendente';
            return isTargetType && isPendente;
        }).length;
    }
};

window.AlertarFeriadosBadge = AlertarFeriadosBadge;
