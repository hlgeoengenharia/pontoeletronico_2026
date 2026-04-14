/**
 * JustificativaHistory - ChronoSync Module
 * Renderizador de cartões de justificativas enviadas pelo tripulante.
 */
export const JustificativaHistory = {
    render(item, options = {}) {
        const date = new Date(item.time || item.created_at);
        const content = item.content || item.descricao || '(Sem descrição)';
        const status = (item.status || 'pendente').toLowerCase();
        
        const isApproved = status === 'aprovado' || status === 'abonado';
        const isRejected = status === 'rejeitado';
        const statusColor = isApproved ? 'text-emerald-500' : (isRejected ? 'text-rose-500' : 'text-amber-500');
        const statusBg = isApproved ? 'bg-emerald-500/10' : (isRejected ? 'bg-rose-500/10' : 'bg-amber-500/10');
        const borderColor = isApproved ? 'border-emerald-500/50' : (isRejected ? 'border-rose-500/50' : 'border-amber-500/50');

        // Governança de Ações via EventManager
        let actionButtons = '';
        const canEdit = window.EventManager ? window.EventManager.canEdit(item, options) : false;

        if (canEdit && !options.hideActions) {
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
        }

        if (options.isSlim) {
            return `
                <div id="card-slim-${item.id}" class="bg-white/[0.03] border border-white/5 rounded-xl p-2.5 flex items-start gap-3 border-l-4 ${borderColor} group/slim hover:bg-white/5 transition-all">
                    <div class="size-6 rounded-lg ${statusBg} flex items-center justify-center border border-white/5 shadow-sm shrink-0">
                        <span class="material-symbols-outlined text-[14px] ${statusColor}">fact_check</span>
                    </div>
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center justify-between mb-0.5">
                            <h5 class="text-[8px] font-black uppercase tracking-widest text-slate-500 italic">JUSTIFICATIVA</h5>
                            <span class="text-[7px] font-bold text-slate-600">${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <p class="text-[10px] text-slate-400 leading-tight italic line-clamp-2">"${content}"</p>
                    </div>
                </div>
            `;
        }

        return `
            <div class="bg-white/5 border border-white/5 rounded-2xl p-4 space-y-3 group border-l-4 ${borderColor} transition-all hover:bg-white/10 relative">
                <div class="flex justify-between items-start">
                    <div class="flex items-center gap-2">
                        <div class="size-7 rounded-lg ${statusBg} flex items-center justify-center">
                            <span class="material-symbols-outlined text-[16px] ${statusColor}">fact_check</span>
                        </div>
                        <div>
                            <div class="flex items-center gap-2">
                                <h5 class="text-[10px] font-black uppercase tracking-widest text-slate-100 italic">JUSTIFICATIVA DE PONTO</h5>
                                <span class="px-2 py-0.5 rounded-full text-[7px] font-black tracking-tighter ${statusBg} ${statusColor} uppercase border border-white/5">${status}</span>
                            </div>
                            <p class="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">
                                ${date.toLocaleDateString('pt-BR')} às ${date.toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})}
                            </p>
                        </div>
                    </div>
                    <span class="text-[7px] font-black px-2 py-1 bg-white/5 rounded-md text-slate-500 border border-white/5 uppercase tracking-widest italic">Manual</span>
                </div>

                <div class="bg-black/20 rounded-xl p-3 border border-white/5">
                    <p class="text-[10px] text-slate-400 leading-relaxed italic line-clamp-4 font-medium opacity-80">"${content}"</p>
                </div>

                ${item.admin_feedback ? `
                    <div class="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-3 mt-2 animate-in zoom-in-95 duration-500">
                        <div class="flex items-center gap-2 mb-1.5">
                            <span class="material-symbols-outlined text-[14px] text-emerald-500">comment</span>
                            <p class="text-[8px] font-black text-emerald-500 uppercase tracking-widest">Feedback do Administrador</p>
                        </div>
                        <p class="text-[10px] text-slate-300 leading-relaxed font-medium">
                            ${item.admin_feedback}
                        </p>
                        <p class="text-[7px] text-slate-600 font-bold uppercase mt-2 text-right">Analizado em ${new Date(item.data_analise).toLocaleDateString('pt-BR')} às ${new Date(item.data_analise).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})}</p>
                    </div>
                ` : ''}
                
                ${actionButtons}
            </div>
        `;
    }
};
