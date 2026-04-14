/**
 * Justificativas History Module - ChronoSync Core
 * Gerencia a renderização de cards de justificativa na timeline.
 */
export const JustificativasHistory = {
    render(item, options = {}) {
        // PRIORIDADE: created_at (Timestamp completo) > data_incidente (Pode ser string sem hora)
        const date = new Date(item.created_at || item.data_incidente || item.data_hora || new Date());
        const icon = 'history_edu';
        
        const status = (item.status || 'pendente').toLowerCase();
        
        // Cores baseadas no status
        let statusClass = 'bg-amber-500/10 text-amber-500 border-amber-500/20';
        let accentBorder = 'border-l-amber-500';
        let statusLabel = 'PENDENTE';

        if (status === 'abonado' || status === 'aprovado') {
            statusClass = 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
            accentBorder = 'border-l-emerald-500';
            statusLabel = 'APROVADO';
        } else if (status === 'rejeitado' || status === 'negado') {
            statusClass = 'bg-rose-500/10 text-rose-500 border-rose-500/20';
            accentBorder = 'border-l-rose-500';
            statusLabel = 'REJEITADO';
        }

        const isEditing = options.editingId === item.id;
        
        let actionButtons = '';
        let contentHtml = '';
        const hasAttachment = (item.evidencia_url || item.url_anexo);

        if (isEditing) {
            contentHtml = `
                <div class="space-y-4">
                    <div class="space-y-1.5">
                        <p class="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Tipo de Incidente</p>
                        <select id="edit-type-${item.id}" 
                            class="w-full bg-black/40 border border-primary/30 rounded-xl p-3 text-[11px] text-slate-200 focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all font-medium">
                            <option value="ESQUECIMENTO" ${item.tipo_divergencia === 'ESQUECIMENTO' ? 'selected' : ''}>ESQUECIMENTO</option>
                            <option value="PROBLEMA_TECNICO" ${item.tipo_divergencia === 'PROBLEMA_TECNICO' ? 'selected' : ''}>PROBLEMA TÉCNICO</option>
                            <option value="SERVICO_EXTERNO" ${item.tipo_divergencia === 'SERVICO_EXTERNO' ? 'selected' : ''}>SERVIÇO EXTERNO</option>
                            <option value="OUTROS" ${item.tipo_divergencia === 'OUTROS' ? 'selected' : ''}>OUTROS</option>
                        </select>
                    </div>
                    <div class="space-y-1.5">
                        <p class="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Descrição</p>
                        <textarea id="edit-desc-${item.id}" 
                            class="w-full bg-black/40 border border-primary/30 rounded-xl p-3 text-[11px] text-slate-200 focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all font-medium min-h-[80px]"
                            placeholder="Descreva o motivo...">${item.descricao || item.content || ''}</textarea>
                    </div>
                </div>
            `;
            actionButtons = `
                <div class="flex gap-2 justify-end pt-2 border-t border-white/5 mt-3">
                    <button onclick="window.cancelInlineEdit()" 
                        class="h-9 px-4 bg-white/5 border border-white/10 rounded-2xl text-slate-500 hover:bg-white/10 transition-all text-[8px] font-black uppercase tracking-widest">
                        Cancelar
                    </button>
                    <button onclick="window.saveInlineEdit('${item.id}', 'justificativa')" 
                        class="h-9 px-6 bg-primary/20 border border-primary/40 rounded-2xl text-primary hover:bg-primary hover:text-white transition-all text-[8px] font-black uppercase tracking-widest shadow-lg shadow-primary/10">
                        Salvar Alterações
                    </button>
                </div>
            `;
        } else {
            const hasAnalysis = status !== 'pendente';
            const adminObs = item.observacao_admin || (status === 'abonado' ? 'Solicitação aprovada e abono processado.' : status === 'rejeitado' ? 'Solicitação não acatada pela gestão.' : '');

            contentHtml = `
                <div class="space-y-3">
                    <div class="bg-black/30 rounded-2xl p-4 border border-white/5 shadow-inner">
                        <p class="text-[12px] text-slate-300 leading-relaxed italic font-medium opacity-90 line-clamp-4">"${item.descricao || item.content || 'Sem descrição detalhada.'}"</p>
                    </div>
                    
                    ${hasAnalysis ? `
                        <div class="bg-primary/10 border border-primary/20 rounded-2xl p-4 animate-in slide-in-from-top-2 duration-300">
                             <div class="flex items-center gap-2 mb-2">
                                <span class="material-symbols-outlined text-primary text-sm font-variation-settings-fill">quick_reference_all</span>
                                <p class="text-[9px] font-black uppercase tracking-widest text-primary">Parecer da Gestão</p>
                             </div>
                             <p class="text-[11px] text-slate-200 leading-relaxed font-medium italic">"${adminObs}"</p>
                        </div>
                    ` : ''}
                </div>
            `;

            if (status === 'pendente') {
                actionButtons = `
                    <div class="flex flex-wrap gap-2 justify-end pt-3 border-t border-white/5 mt-3">
                        ${hasAttachment ? `
                            <button onclick="window.open('${item.evidencia_url || item.url_anexo}', '_blank')" 
                                class="h-10 px-4 bg-primary/20 border border-primary/30 rounded-2xl text-primary hover:bg-primary hover:text-white transition-all flex items-center gap-2 text-[9px] font-black uppercase tracking-widest shadow-md">
                                <span class="material-symbols-outlined text-sm">attach_file</span>
                                <span>Anexo</span>
                            </button>
                        ` : ''}
                        <button onclick="window.editarAnotacao('${item.id}', 'justificativa')" 
                            class="h-10 px-4 bg-white/5 border border-white/10 rounded-2xl text-slate-400 hover:bg-primary/20 hover:text-primary transition-all flex items-center gap-2 text-[9px] font-black uppercase tracking-widest shadow-md">
                            <span class="material-symbols-outlined text-sm">edit</span>
                            <span>Editar</span>
                        </button>
                        <button onclick="window.excluirAnotacao('${item.id}', 'justificativa')" 
                            class="h-10 px-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-500 hover:bg-rose-500 hover:text-white transition-all flex items-center gap-2 text-[9px] font-black uppercase tracking-widest shadow-sm">
                            <span class="material-symbols-outlined text-sm">delete</span>
                            <span>Excluir</span>
                        </button>
                    </div>
                `;
            } else if (hasAttachment) {
                actionButtons = `
                    <div class="flex gap-2 justify-end pt-3 border-t border-white/5 mt-3">
                        <button onclick="window.open('${item.evidencia_url || item.url_anexo}', '_blank')" 
                            class="h-10 px-4 bg-primary/20 border border-primary/30 rounded-2xl text-primary hover:bg-primary hover:text-white transition-all flex items-center gap-2 text-[9px] font-black uppercase tracking-widest shadow-sm">
                            <span class="material-symbols-outlined text-sm">attach_file</span>
                            <span>Anexo</span>
                        </button>
                    </div>
                `;
            }
        }

        // --- MODO SLIM (Para Espelho de Ponto / Histórico) ---
        if (options.isSlim) {
            return `
                <div id="card-slim-${item.id}" class="bg-white/[0.03] border border-white/5 rounded-xl p-2.5 flex items-start gap-3 border-l-4 ${accentBorder} group/slim hover:bg-white/5 transition-all">
                    <div class="size-6 rounded-lg ${statusClass} flex items-center justify-center border shadow-sm shrink-0">
                        <span class="material-symbols-outlined text-[14px]">${icon}</span>
                    </div>
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center justify-between mb-0.5">
                            <div class="flex items-center gap-2">
                                <h5 class="text-[8px] font-black uppercase tracking-widest text-slate-500 italic">JUSTIFICATIVA</h5>
                                <span class="px-1.5 py-0.5 rounded border ${statusClass} text-[6px] font-black">${statusLabel}</span>
                            </div>
                            <span class="text-[7px] font-bold text-slate-600">${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <p class="text-[10px] text-slate-300 leading-tight italic line-clamp-2">"${item.descricao || item.content || '...'}"</p>
                    </div>
                    <div class="flex items-center gap-1 opacity-0 group-hover/slim:opacity-100 transition-all">
                        ${hasAttachment ? `
                             <a href="${item.evidencia_url || item.url_anexo}" target="_blank" class="p-1 text-amber-500 hover:text-amber-400">
                                 <span class="material-symbols-outlined text-xs">attach_file</span>
                             </a>
                        ` : ''}
                        ${status === 'pendente' && !options.hideActions ? `
                            <button onclick="window.editarAnotacao('${item.id}', 'justificativa')" class="p-1 text-slate-600 hover:text-primary transition-colors">
                                 <span class="material-symbols-outlined text-xs">edit</span>
                            </button>
                        ` : ''}
                    </div>
                </div>
            `;
        }

        return `
            <div id="card-${item.id}" class="bg-white/5 border border-white/5 rounded-3xl p-5 space-y-4 group border-l-4 ${accentBorder} transition-all hover:bg-white/10 relative ${isEditing ? 'ring-1 ring-primary/30 bg-primary/5 shadow-2xl' : ''}">
                <div class="flex justify-between items-start">
                    <div class="flex items-center gap-3">
                        <div class="size-9 rounded-xl ${statusClass} flex items-center justify-center border shadow-inner">
                            <span class="material-symbols-outlined text-[20px]">${icon}</span>
                        </div>
                        <div>
                             <div class="flex items-center gap-2 mb-0.5">
                                 <h5 class="text-[10px] font-black uppercase tracking-widest text-slate-100">JUSTIFICATIVA DE PONTO</h5>
                                 <span class="px-2 py-0.5 rounded-md text-[7px] font-black border ${statusClass}">${statusLabel}</span>
                             </div>
                             <p class="text-[11px] font-bold text-slate-500 uppercase tracking-tighter">
                                 ${date.toLocaleTimeString('pt-BR')} | ${date.toLocaleDateString('pt-BR')}
                             </p>
                         </div>
                    </div>
                </div>

                ${contentHtml}
                
                ${actionButtons}
            </div>
        `;
    }
};
