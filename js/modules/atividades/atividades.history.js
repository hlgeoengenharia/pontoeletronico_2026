/**
 * Atividades History Module - ChronoSync Core
 * Gerencia a renderização de logs de atividades diárias na timeline.
 */
export const AtividadesHistory = {
    render(item, options = {}) {
        // PRIORIDADE: created_at (Timestamp completo) > data (Pode ser string sem hora)
        const date = new Date(item.created_at || item.data || item.data_hora || new Date());
        const now = new Date();
        const diffHours = (now - date) / (1000 * 60 * 60);
        
        // Regra: Editável por 24 horas
        const canModify = diffHours < 24 && !options.isInspectionMode;
        
        const icon = 'edit_note';
        const accentClass = 'bg-primary/10 text-primary border-primary/20';
        const accentBorder = 'border-l-primary';

        const isEditing = options.editingId === item.id;
        
        let actionButtons = '';
        let contentHtml = '';

        if (isEditing) {
            contentHtml = `
                <div class="space-y-3">
                    <textarea id="edit-content-${item.id}" 
                        class="w-full bg-black/40 border border-primary/30 rounded-xl p-3 text-[11px] text-slate-200 focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all font-medium min-h-[80px]"
                        placeholder="Descreva a atividade...">${item.conteudo || item.content || ''}</textarea>
                </div>
            `;
            actionButtons = `
                <div class="flex gap-2 justify-end pt-2 border-t border-white/5 mt-3">
                    <button onclick="window.cancelInlineEdit()" 
                        class="h-8 px-4 bg-white/5 border border-white/10 rounded-lg text-slate-500 hover:bg-white/10 transition-all text-[8px] font-black uppercase tracking-widest">
                        Cancelar
                    </button>
                    <button onclick="window.saveInlineEdit('${item.id}', 'atividade')" 
                        class="h-8 px-5 bg-primary/20 border border-primary/40 rounded-lg text-primary hover:bg-primary hover:text-white transition-all text-[8px] font-black uppercase tracking-widest shadow-lg shadow-primary/10">
                        Salvar Alterações
                    </button>
                </div>
            `;
        } else {
            contentHtml = `
                <div class="bg-black/20 rounded-xl p-3 border border-white/5">
                    <p class="text-[11px] text-slate-300 leading-relaxed font-medium opacity-90">${item.conteudo || item.content || 'Nenhuma descrição informada.'}</p>
                </div>
            `;
            if (canModify) {
                actionButtons = `
                    <div class="flex gap-2 justify-end pt-1.5 border-t border-white/5 mt-3">
                        <button onclick="window.editarAnotacao('${item.id}', 'atividade')" 
                            class="h-8 px-3 bg-white/5 border border-white/10 rounded-lg text-slate-400 hover:bg-primary/20 hover:text-primary transition-all flex items-center gap-2 text-[8px] font-black uppercase tracking-widest shadow-sm">
                            <span class="material-symbols-outlined text-xs">edit</span>
                            <span>Editar</span>
                        </button>
                        <button onclick="window.excluirAnotacao('${item.id}', 'atividade')" 
                            class="h-8 px-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-500 hover:bg-rose-500 hover:text-white transition-all flex items-center gap-2 text-[8px] font-black uppercase tracking-widest shadow-sm">
                            <span class="material-symbols-outlined text-xs">delete</span>
                            <span>Excluir</span>
                        </button>
                    </div>
                `;
            }
        }

        return `
            <div id="card-${item.id}" class="bg-white/5 border border-white/5 rounded-2xl p-4 space-y-3 group border-l-4 ${accentBorder} transition-all hover:bg-white/10 relative ${isEditing ? 'ring-1 ring-primary/30 bg-primary/5' : ''}">
                <div class="flex justify-between items-start">
                    <div class="flex items-center gap-2">
                        <div class="size-7 rounded-lg ${accentClass} flex items-center justify-center border shadow-sm">
                            <span class="material-symbols-outlined text-[16px]">${icon}</span>
                        </div>
                        <div>
                            <h5 class="text-[9px] font-black uppercase tracking-widest text-slate-100 italic">ATIVIDADE DO DIA</h5>
                            <p class="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">
                                ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} • ${date.toLocaleDateString('pt-BR')}
                            </p>
                        </div>
                    </div>
                    ${!canModify && !isEditing ? `
                        <span class="material-symbols-outlined text-[12px] text-slate-600" title="Histórico Permanente">lock</span>
                    ` : ''}
                </div>

                ${contentHtml}
                
                ${actionButtons}
            </div>
        `;
    }
};
