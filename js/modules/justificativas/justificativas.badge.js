/**
 * Justificativas Badge Module - ChronoSync Core
 * Gerencia a atualização visual dos indicadores de notificações.
 */
export const JustificativasBadge = {
    /**
     * Atualiza o badge do sino com contagens pendentes.
     * @param {number} count 
     */
    updateSino(count) {
        const badge = document.getElementById('badge-sino') || document.getElementById('notif-badge');
        if (!badge) return;
        
        if (count > 0) {
            badge.innerText = count > 99 ? '99+' : count;
            badge.classList.remove('hidden');
        } else {
            badge.classList.add('hidden');
        }
    },
    
    /**
     * Atualiza o badge do diário no rodapé/dashboard.
     * @param {number} count 
     */
    updateDiario(count) {
        const badge = document.getElementById('badge-diario') || document.getElementById('notif-badge-footer');
        if (!badge) return;
        
        if (count > 0) {
            badge.innerText = count > 99 ? '99+' : count;
            badge.classList.remove('hidden');
        } else {
            badge.classList.add('hidden');
        }
    }
};
