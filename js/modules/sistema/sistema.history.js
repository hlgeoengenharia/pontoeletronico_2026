import { ResultadoFeedbackHistory } from '../justificativas/resultadofeedback.history.js';

/**
 * Sistema History Module - ChronoSync Core
 * Renderiza logs automáticos do sistema ou delega para o feedback de análise.
 */
export const SistemaHistory = {
    render(item, options = {}) {
        const content = item.mensagem_padrao || item.content || '';
        
        // Se for um log de análise (feedback do gestor), delegamos para o renderizador especializado
        if (content.includes('[ANÁLISE]')) {
            return ResultadoFeedbackHistory.render(item, options);
        }

        const date = new Date(item.created_at || item.data_hora || new Date());
        const isPenalidade = content.includes('[PENALIDADE]');
        
        const accentBorder = isPenalidade ? 'border-l-rose-500' : 'border-l-slate-500';
        const accentClass = isPenalidade ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' : 'bg-slate-500/10 text-slate-500 border-slate-500/20';
        const icon = isPenalidade ? 'error' : 'analytics';
        const title = isPenalidade ? 'ALERTA DE PENALIDADE' : 'NOTIFICAÇÃO DE SISTEMA';

        // Renderização do Feedback da Gestão (Unificação ChronoSync)
        let feedbackHtml = '';
        if (item.admin_feedback) {
            const statusLabel = (item.status || 'pendente').toUpperCase();
            const statusClass = statusLabel === 'ABONADO' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border-rose-500/30';
            
            feedbackHtml = `
                <div class="mt-4 pt-4 border-t border-white/5 space-y-3">
                    <div class="flex items-center gap-2">
                        <span class="material-symbols-outlined text-[14px] text-amber-400">psychology_alt</span>
                        <h6 class="text-[8px] font-black uppercase tracking-widest text-slate-400">Parecer da Gestão</h6>
                        <span class="px-2 py-0.5 rounded-full text-[7px] font-black border ${statusClass}">${statusLabel}</span>
                    </div>
                    <div class="bg-amber-400/5 rounded-xl p-3 border border-amber-400/10">
                        <p class="text-[10px] text-amber-100/80 leading-relaxed font-bold italic">"${item.admin_feedback}"</p>
                    </div>
                </div>
            `;
        }

        return `
            <div id="card-${item.id}" class="bg-white/5 border border-white/5 rounded-2xl p-4 space-y-3 group border-l-4 ${accentBorder} transition-all hover:bg-white/10 relative animate-in slide-in-from-right-4 duration-500">
                <div class="flex justify-between items-start">
                    <div class="flex items-center gap-2">
                        <div class="size-7 rounded-lg ${accentClass} flex items-center justify-center border shadow-sm">
                            <span class="material-symbols-outlined text-[16px]">${icon}</span>
                        </div>
                        <div>
                            <h5 class="text-[9px] font-black uppercase tracking-widest text-slate-100 italic">${title}</h5>
                            <p class="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">
                                ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} • ${date.toLocaleDateString('pt-BR')}
                            </p>
                        </div>
                    </div>
                </div>

                <div class="bg-black/20 rounded-xl p-3 border border-white/5">
                    <p class="text-[11px] text-slate-300 leading-relaxed font-medium opacity-90">${content}</p>
                </div>

                ${feedbackHtml}
            </div>
        `;
    }
};
