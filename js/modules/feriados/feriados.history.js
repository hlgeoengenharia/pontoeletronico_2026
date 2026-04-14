import { EventManager } from '../../event-manager.js';

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

        // Estado de "Visto" (Lógica de Lote - Admin sempre vê como consolidado)
        const isVisto = options.isContextOnline ? true : (item.list || []).every(f => localStorage.getItem(`visto_feriado_${f.id}`) === 'true');
        
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
        const canEdit = EventManager.canEdit(item, options);

        if (canEdit) {
            actionButtons = `
                <div class="flex justify-end pt-2">
                    <button onclick="excluirItemHistorico('${item.id}')" 
                        class="h-8 px-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-500 hover:bg-rose-500 hover:text-white transition-all flex items-center gap-2 text-[9px] font-black uppercase tracking-widest shadow-lg shadow-rose-500/10 group/del">
                        <span class="material-symbols-outlined text-[18px] group-hover/del:rotate-12 transition-transform">delete</span>
                        <span>Excluir Lote</span>
                    </button>
                </div>
            `;
        }

        // --- MODO SLIM (Para Espelho de Ponto / Histórico) ---
        if (options.isSlim) {
            const firstChild = (item.list && item.list[0]) || item;
            const labelStr = (firstChild.tipo || item.label || 'FERIADO').replace('_',' ').toUpperCase();
            const descStr = firstChild.descricao || item.content || '';
            const isFérias = labelStr.includes('FÉRIAS');
            
            return `
                <div id="card-slim-${item.id}" class="bg-white/[0.03] border border-white/5 rounded-xl p-2.5 flex items-start gap-3 border-l-4 ${isFérias ? 'border-l-sky-500' : 'border-l-rose-500'} group/slim hover:bg-white/5 transition-all">
                    <div class="size-6 rounded-lg ${isFérias ? 'bg-sky-500/10 text-sky-400 border-sky-500/20' : 'bg-rose-500/10 text-rose-500 border-rose-500/20'} flex items-center justify-center border shadow-sm shrink-0">
                        <span class="material-symbols-outlined text-[14px]">${isFérias ? 'beach_access' : 'calendar_month'}</span>
                    </div>
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center justify-between mb-0.5">
                            <h5 class="text-[8px] font-black uppercase tracking-widest ${isFérias ? 'text-sky-500' : 'text-rose-500'} italic">${labelStr}</h5>
                        </div>
                        <p class="text-[10px] text-slate-300 leading-tight italic font-medium">"${descStr || 'Data comemorativa / Folga agendada'}"</p>
                    </div>
                </div>
            `;
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
