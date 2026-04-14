import { EventManager } from '../../event-manager.js';

/**
 * Comunicado.History - ChronoSync Module
 * Template visual para os cards de comunicado no histórico.
 */
export const ComunicadoHistory = {
    /**
     * Renderiza o card de um comunicado padrão
     * @param {object} item Dados do comunicado
     * @returns {string} HTML string
     */
    render(item, options = {}) {
        const date = new Date(item.data_ref || item.created_at);
        const icon = 'campaign';
        
        // Extrair minutos do conteúdo [LIMITE:XX] se houver
        const match = (item.content || '').match(/\[LIMITE:(\d+)\]/);
        const extraMinutes = match ? match[1] : null;
        
        // Estado de "Ciente" (apenas para colaborador e se não for contexto Online)
        const isCiente = options.isContextOnline ? false : (localStorage.getItem(`ciente_${item.id}`) === 'true');
        
        const bgBadge = isCiente ? 'bg-emerald-500/10 text-emerald-500' : 'bg-primary/10 text-primary';
        const colorClass = isCiente ? 'border-l-emerald-500/80' : 'border-l-primary/80';

        // Botão de Ciência (EXCLUSIVO PARA HORA EXTRA no portal do colaborador)
        let actionButtons = '';
        const canEdit = EventManager.canEdit(item, options);

        if (canEdit) {
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
        } else if (extraMinutes && !options.hideActions) { // Somente para Horas Extras no portal do funcionário
            actionButtons = `
                <div class="flex justify-end pt-1.5">
                    <button onclick="window.marcarCiente && window.marcarCiente('${item.id}', 'HE')" ${isCiente ? 'disabled' : ''} 
                        class="px-4 py-2 rounded-xl border transition-all text-[9px] font-black uppercase tracking-widest flex items-center gap-2 ${isCiente ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500 opacity-60' : 'bg-primary/10 border-primary/20 text-primary shadow-lg shadow-primary/10'}">
                        <span class="material-symbols-outlined text-sm font-black">${isCiente ? 'verified' : 'check'}</span>
                        <span>${isCiente ? 'CONFIRMADO' : 'ESTOU CIENTE'}</span>
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
                            <h5 class="text-[8px] font-black uppercase tracking-widest text-slate-500 italic">${extraMinutes ? 'HORA EXTRA' : 'COMUNICADO'}</h5>
                            <span class="text-[7px] font-bold text-slate-600">${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <p class="text-[10px] text-slate-400 leading-tight italic line-clamp-2">"${cleanContent || '...'}"</p>
                    </div>
                    ${extraMinutes && !isCiente && !options.hideActions ? `
                        <button onclick="window.marcarCiente && window.marcarCiente('${item.id}', 'HE')" class="px-2 py-1 bg-primary/10 border border-primary/20 rounded-md text-primary text-[7px] font-black uppercase tracking-widest hover:bg-primary hover:text-white transition-all">
                             CONFIRMAR
                        </button>
                    ` : ''}
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
                                <h5 class="text-[10px] font-black uppercase tracking-widest text-slate-100 italic">${extraMinutes ? 'SOLICITAÇÃO DE HORA EXTRA' : 'COMUNICADO DO DIA'}</h5>
                                ${extraMinutes ? `<span class="bg-black/40 px-2 py-0.5 rounded-md text-[8px] font-black text-amber-500 border border-amber-500/20">+${extraMinutes} MIN</span>` : ''}
                            </div>
                            <p class="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">
                                ${date.toLocaleDateString('pt-BR')} às ${date.toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})}
                            </p>
                        </div>
                    </div>
                    <span class="text-[7px] font-black px-2 py-1 bg-white/5 rounded-md text-slate-500 border border-white/5 uppercase tracking-widest">${item.target || item.tipo_comunicado || 'GERAL'}</span>
                </div>

                <div class="bg-black/20 rounded-xl p-3 border border-white/5">
                    <p class="text-[10px] text-slate-400 leading-relaxed italic line-clamp-3 font-medium opacity-80">"${(item.content || "").replace(/\[LIMITE:\d+\]\s*/, '')}"</p>
                </div>
                
                ${actionButtons}
            </div>
        `;
    }
};
