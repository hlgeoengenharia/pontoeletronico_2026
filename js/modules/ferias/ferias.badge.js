/**
 * Ferias Badge Module - ChronoSync Core
 * Gerencia a atualização visual dos indicadores de férias pendentes.
 */
export const FeriasBadge = {
    /**
     * Atualiza o contador de férias mensais/anual no dashboard administrativo.
     */
    updateManagement(count) {
        const badge = document.getElementById('stat-ferias-mes');
        if (!badge) return;
        
        badge.innerText = count || '0';
    },

    /**
     * Atualiza o badge do menu lateral 'Férias (Pendente)'.
     */
    updateMenu(count) {
        const badge = document.getElementById('badge-ferias-pendente');
        if (!badge) return;
        
        if (count > 0) {
            badge.innerText = count;
            badge.classList.remove('hidden');
        } else {
            badge.classList.add('hidden');
        }
    }
};
