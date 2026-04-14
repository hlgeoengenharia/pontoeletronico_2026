/**
 * Feriados.History - ChronoSync Module
 * Template visual para os cards de feriados e folgas (Rosa Premium).
 */
export const FeriadosHistory = {
    /**
     * Renderiza o card de cronograma (Feriados/Folgas)
     * @param {object} item Dados agrupados do feriado
     * @returns {string} HTML string
     */
    render(item, options = {}) {
        const date = new Date(item.data_ref || item.created_at);
        const dayBadges = (item.list || []).sort((a,b) => a.data.localeCompare(b.data)).map(f => {
            const dateLabel = f.data.split('-').reverse().slice(0,2).join('/');
            const tipoStr = (f.tipo || '').toLowerCase();
            let badgeClass = 'bg-amber-500/10 text-amber-500 border border-amber-500/20';
            if (tipoStr.includes('folga')) badgeClass = 'bg-rose-500/10 text-rose-500 border border-rose-500/20';
            else if (tipoStr.includes('regional')) badgeClass = 'bg-violet-500/10 text-violet-400 border border-violet-500/20';
            
            return `
                <div class="w-full px-4 py-2.5 rounded-xl text-[10px] font-black uppercase flex items-center transition-all hover:brightness-110 ${badgeClass}">
                    <span class="tracking-widest">${dateLabel} • ${f.tipo.replace('_',' ').toUpperCase()}${f.descricao ? ' - ' + f.descricao : ''}</span>
                </div>
            `;
        }).join('');

        // Estado de "Visto" (Lógica de Lote)
        const isVisto = (item.list || []).every(f => localStorage.getItem(`visto_feriado_${f.id}`) === 'true');
        
        const statusBadge = isVisto 
            ? `
                <div class="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-500">
                    <span class="material-symbols-outlined text-[12px] font-black">verified</span>
                    <span class="text-[8px] font-black uppercase tracking-widest">VISUALIZADO</span>
                </div>
            ` 
            : `
                <div class="flex items-center gap-2 px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full text-amber-500 animate-pulse">
                    <span class="material-symbols-outlined text-[12px] font-black">new_releases</span>
                    <span class="text-[8px] font-black uppercase tracking-widest">NOVO EVENTO</span>
                </div>
            `;

        let actionButtons = '';
        if (options.isAdmin && !options.isContextDiario) {
            const canDelete = window.EventManager ? window.EventManager.canEdit(item) : true;

            if (canDelete) {
                actionButtons = `
                    <div class="flex justify-end pt-2">
                        <button onclick="window.excluirItemHistorico && window.excluirItemHistorico('${item.id}', 'ferias_folgas')" 
                            class="p-2.5 bg-white/5 border border-white/10 rounded-2xl text-slate-400 hover:text-rose-500 hover:border-rose-500/30 transition-all flex items-center justify-center gap-2 group/del">
                            <span class="material-symbols-outlined text-[18px]">delete</span>
                            <span class="text-[9px] font-black uppercase tracking-widest">Excluir Lote</span>
                        </button>
                    </div>
                `;
            }
        }

        return `
            <div id="event-${item.id}" class="bg-[#0f1115] border border-white/5 rounded-[32px] p-6 space-y-5 group border-l-[6px] border-l-rose-500/80 shadow-2xl relative transition-all hover:bg-[#15181e] ${isVisto ? 'opacity-80' : 'ring-1 ring-rose-500/20'}">
                <div class="flex justify-between items-center">
                    <div class="flex items-center gap-3">
                        <span class="material-symbols-outlined text-rose-500 text-[20px]">calendar_month</span>
                        <h5 class="text-[10px] font-black uppercase tracking-[0.2em] text-rose-500">FERIADOS / FOLGAS</h5>
                        <span class="text-[11px] font-bold text-slate-600 ml-2 tracking-tight">
                            ${date.toLocaleDateString('pt-BR')} | ${date.toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})}
                        </span>
                    </div>
                    ${statusBadge}
                </div>

                <div class="space-y-2.5">
                    ${dayBadges}
                </div>

                ${actionButtons}
            </div>
        `;
    }
};
