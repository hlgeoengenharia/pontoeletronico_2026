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
        const icon = 'timer';
        
        // Extrair minutos do conteúdo [LIMITE:XX]
        const match = (item.content || '').match(/\[LIMITE:(\d+)\]/);
        const extraMinutes = match ? match[1] : '120';
        
        // Estado de "Ciente" (apenas para colaborador)
        const isCiente = localStorage.getItem(`ciente_${item.id}`) === 'true';
        
        const bgBadge = isCiente ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500';
        const colorClass = isCiente ? 'border-l-emerald-500' : 'border-l-amber-500';

        // Botões de Ciência (Se Colaborador) e Botões de Admin (Se Admin fora do contexto Diário)
        let actionButtons = '';
        if (options.isAdmin && !options.isContextDiario) {
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
            actionButtons = `
                <div class="flex justify-end pt-1.5">
                    <button onclick="window.marcarCiente && window.marcarCiente('${item.id}', 'HE')" ${isCiente ? 'disabled' : ''} 
                        class="px-4 py-2 rounded-xl border transition-all text-[9px] font-black uppercase tracking-widest flex items-center gap-2 ${isCiente ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500 opacity-60' : 'bg-amber-500/10 border-amber-500/20 text-amber-500 shadow-lg shadow-amber-500/10'}">
                        <span class="material-symbols-outlined text-sm font-black">${isCiente ? 'verified' : 'check'}</span>
                        <span>${isCiente ? 'CONFIRMADO' : 'ESTOU CIENTE'}</span>
                    </button>
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
                    <p class="text-[11px] text-slate-400 leading-relaxed italic line-clamp-3 font-medium opacity-80">"${item.content.replace(/\[LIMITE:\d+\]\s*/, '')}"</p>
                </div>
                
                ${actionButtons}
            </div>
        `;
    }
};
