import { EventManager } from '../../event-manager.js';

/**
 * HoraExtra.History - ChronoSync Module
 * Template visual para os cards de hora extra no histórico.
 */
export const HoraExtraHistory = {
    /**
     * Renderiza o card de uma solicitação de hora extra
     * @param {object} item Dados do comunicado tipo hora_extra
     * @returns {string} HTML string
     */
    render(item, options = {}) {
        const date = new Date(item.data_ref || item.created_at);
        const typeKey = (item.tipo || item.subtipo || '').toLowerCase();
        const isDiaExtra = typeKey === 'dia_trabalho_extra';
        const icon = isDiaExtra ? 'event_available' : 'timer';
        
        // Extrair minutos do conteúdo [LIMITE:XX] ou Data do Dia Extra [DIA_EXTRA:XX]
        const matchLimit = (item.content || '').match(/\[LIMITE:(\d+)\]/);
        const extraMinutes = matchLimit ? matchLimit[1] : '120';

        const matchDate = (item.content || '').match(/\[DIA_EXTRA:([\d-]+)\]/);
        const targetDate = matchDate ? matchDate[1] : null;
        
        // Estado de "Ciente" (apenas para colaborador e se não for contexto Online)
        const isCiente = options.isContextOnline ? false : (localStorage.getItem(`ciente_${item.id}`) === 'true');
        
        const bgBadge = isCiente ? 'bg-emerald-500/10 text-emerald-500' : (isDiaExtra ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500');
        const colorClass = isCiente ? 'border-l-emerald-500' : (isDiaExtra ? 'border-l-emerald-500' : 'border-l-amber-500');

        // Botões de Ciência (Se Colaborador) e Botões de Admin (Se Admin fora do contexto Diário)
        const canEdit = EventManager.canEdit(item, options);

        let actionButtons = '';
        if (options.hideActions) {
            actionButtons = '';
        } else if (canEdit) {
            actionButtons = `
                <div class="flex gap-2 justify-end pt-1.5 transition-all">
                    <button onclick="prepararEdicaoInline('${item.id}')" 
                        class="h-8 px-3 bg-primary/10 border border-primary/20 rounded-lg text-primary hover:bg-primary hover:text-white transition-all flex items-center gap-2 text-[8px] font-black uppercase tracking-widest shadow-sm">
                        <span class="material-symbols-outlined text-xs">edit</span>
                        <span>Editar</span>
                    </button>
                    <button onclick="excluirItemHistorico('${item.id}')" 
                        class="h-8 px-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-500 hover:bg-rose-500 hover:text-white transition-all flex items-center gap-2 text-[8px] font-black uppercase tracking-widest shadow-sm">
                        <span class="material-symbols-outlined text-xs">delete</span>
                        <span>Excluir</span>
                    </button>
                </div>
            `;
        } else {
                const btnLabel = isDiaExtra ? 'ESTOU CIENTE' : 'ESTOU CIENTE';
            const btnType = isDiaExtra ? 'DE' : 'HE'; // DE = Dia Extra, HE = Hora Extra (para o handler)
            
            actionButtons = `
                <div class="flex justify-end pt-1.5">
                    <button onclick="window.marcarCiente && window.marcarCiente('${item.id}', '${btnType}')" ${isCiente ? 'disabled' : ''} 
                        class="px-4 py-2 rounded-xl border transition-all text-[9px] font-black uppercase tracking-widest flex items-center gap-2 ${isCiente ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 opacity-60' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 shadow-lg shadow-emerald-500/10'}">
                        <span class="material-symbols-outlined text-sm font-black">${isCiente ? 'verified' : 'check'}</span>
                        <span>${isCiente ? 'CONFIRMADO' : btnLabel}</span>
                    </button>
                </div>
            `;
        }

        // --- MODO SLIM (Para Espelho de Ponto / Histórico) ---
        if (options.isSlim) {
            const cleanContent = (item.content || "").replace(/\[LIMITE:\d+\]\s*/, '');
            return `
                <div id="card-slim-${item.id}" class="bg-white/[0.03] border border-white/5 rounded-xl p-2.5 flex items-start gap-3 border-l-4 ${colorClass} group/slim hover:bg-white/5 transition-all">
                    <div class="size-6 rounded-lg ${bgBadge} flex items-center justify-center border shadow-sm shrink-0">
                        <span class="material-symbols-outlined text-[14px]">${icon}</span>
                    </div>
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center justify-between mb-0.5">
                            <div class="flex items-center gap-2">
                                <h5 class="text-[8px] font-black uppercase tracking-widest text-slate-500 italic">${isDiaExtra ? 'DIA EXTRA' : 'HORA EXTRA'}</h5>
                                ${isDiaExtra ? '' : `<span class="bg-amber-500/20 px-1 py-0.5 rounded text-[6px] font-black text-amber-500">+${extraMinutes}M</span>`}
                            </div>
                            <span class="text-[7px] font-bold text-slate-600">${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <p class="text-[10px] text-slate-400 leading-tight italic line-clamp-2">"${(item.content || "").replace(/\[LIMITE:\d+\]\s*/, '').replace(/\[DIA_EXTRA:[\d-]+\].*?\.\s*/, '') || '...'}"</p>
                    </div>
                </div>
            `;
        }

        if (isDiaExtra) {
            const dateStr = targetDate ? targetDate.split('-').reverse().join('/') : date.toLocaleDateString('pt-BR');
            const cleanContent = (item.content || "").replace(/\[DIA_EXTRA:[\d-]+\].*?\.\s*/, '').trim();

            return `
                <div id="event-${item.id}" class="bg-[#0f1115] border border-white/5 rounded-[32px] p-6 space-y-5 group border-l-[6px] border-l-emerald-500/80 shadow-2xl relative transition-all hover:bg-[#15181e] ${isCiente ? 'opacity-80' : 'ring-1 ring-emerald-500/20'}">
                    <div class="flex justify-between items-center">
                        <div class="flex items-center gap-3">
                            <span class="material-symbols-outlined text-emerald-500 text-[20px]">${icon}</span>
                            <h5 class="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500">CONVOCAÇÃO: DIA EXTRA</h5>
                            <span class="text-[11px] font-bold text-slate-600 ml-2 tracking-tight">
                                ${date.toLocaleDateString('pt-BR')} | ${date.toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})}
                            </span>
                        </div>
                    </div>

                    <div class="space-y-2.5">
                        <div class="w-full px-4 py-3 rounded-xl text-[10px] font-black uppercase flex flex-col gap-2 transition-all hover:brightness-110 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                            <div class="flex items-center gap-2">
                                <span class="material-symbols-outlined md-18">event_available</span>
                                <span class="tracking-widest">DATA AGENDADA: ${dateStr}</span>
                            </div>
                        </div>
                    </div>

                    ${cleanContent ? `
                    <div class="bg-black/20 rounded-xl p-3 border border-white/5">
                        <p class="text-[11px] text-slate-400 leading-relaxed italic line-clamp-3 font-medium opacity-80">"${cleanContent}"</p>
                    </div>` : ''}

                    ${actionButtons}
                </div>
            `;
        }

        return `
            <div class="bg-white/5 border border-white/5 rounded-2xl p-4 space-y-3 group border-l-4 ${colorClass} transition-all hover:bg-white/10 relative">
                <div class="flex justify-between items-start">
                    <div class="flex items-center gap-2">
                        <div class="size-7 rounded-lg ${bgBadge} flex items-center justify-center">
                            <span class="material-symbols-outlined text-[16px]">${icon}</span>
                        </div>
                        <div>
                            <div class="flex items-center gap-2">
                                <h5 class="text-[9px] font-black uppercase tracking-widest text-slate-100">SOLICITAÇÃO DE HORA EXTRA</h5>
                                <span class="bg-black/40 px-2 py-0.5 rounded-md text-[8px] font-black text-amber-500 border border-amber-500/20">+${extraMinutes} MIN</span>
                            </div>
                            <p class="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">
                                ${date.toLocaleDateString('pt-BR')} às ${date.toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})}
                            </p>
                        </div>
                    </div>
                </div>

                <div class="bg-black/20 rounded-xl p-3 border border-white/5">
                    <p class="text-[11px] text-slate-400 leading-relaxed italic line-clamp-3 font-medium opacity-80">"${(item.content || "").replace(/\[LIMITE:\d+\]\s*/, '')}"</p>
                </div>
                
                ${actionButtons}
            </div>
        `;
    }
};
