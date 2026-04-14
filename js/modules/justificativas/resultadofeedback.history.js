/**
 * ResultadoFeedback History Module - ChronoSync
 * Renderiza cards de feedback de análise (Abono/Rejeição) na timeline do funcionário.
 */
export const ResultadoFeedbackHistory = {
    render(item, options = {}) {
        const date = new Date(item.created_at || item.data_hora || new Date());
        const rawMsg = item.mensagem_padrao || item.content || 'Seu pedido foi processado.';
        
        // Parsing robusto para múltiplas linhas (usando [\s\S]* para incluir quebras de linha)
        const contextoMatch = rawMsg.match(/\[CONTEXTO: ([\s\S]*?)\]/);
        const userMatch = rawMsg.match(/\[USER: ([\s\S]*?)\]/);
        const analiseMatch = rawMsg.match(/\[ANÁLISE: ([\s\S]*?)\]/);
        
        const contexto = contextoMatch ? contextoMatch[1].trim() : 'SOLICITAÇÃO DE PONTO';
        const userMsg = userMatch ? userMatch[1].trim() : 'Divergência técnica de localização.';
        const analise = analiseMatch ? analiseMatch[1].trim() : 'PROCESSADO';
        
        // Extrair a mensagem do Admin (tudo após o último colchete de análise)
        const adminMsg = rawMsg.split(/\[ANÁLISE:.*?\]/).pop().trim();

        const isRejeitado = analise.toUpperCase().includes('REJEITAD') || analise.toUpperCase().includes('INDEFERID');
        
        const statusClass = isRejeitado 
            ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' 
            : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
            
        const accentBorder = isRejeitado ? 'border-l-rose-500' : 'border-l-emerald-500';
        const icon = isRejeitado ? 'block' : 'verified';
        const label = isRejeitado ? 'REJEITADO' : 'APROVADO';

        return `
            <div id="card-${item.id}" class="bg-white/5 border border-white/5 rounded-3xl p-5 space-y-4 group border-l-4 ${accentBorder} transition-all hover:bg-white/10 relative animate-in slide-in-from-right-4 duration-500">
                <div class="flex justify-between items-start">
                    <div class="flex items-center gap-3">
                        <div class="size-9 rounded-xl ${statusClass} flex items-center justify-center border shadow-inner">
                            <span class="material-symbols-outlined text-[20px] font-variation-settings-fill">${icon}</span>
                        </div>
                        <div>
                             <div class="flex flex-col mb-1">
                                 <h4 class="text-[9px] font-bold text-slate-400 uppercase tracking-tighter mb-0.5">${contexto.toUpperCase()}</h4>
                                 <div class="flex items-center gap-2">
                                     <h5 class="text-[10px] font-black uppercase tracking-widest text-slate-100">Resultado de Análise</h5>
                                     <span class="px-2 py-0.5 rounded-md text-[7px] font-black border ${statusClass}">${label}</span>
                                 </div>
                             </div>
                             <p class="text-[11px] font-bold text-slate-500 uppercase tracking-tighter">
                                 ${date.toLocaleTimeString('pt-BR')} | ${date.toLocaleDateString('pt-BR')}
                             </p>
                         </div>
                    </div>
                </div>

                <div class="space-y-4">
                    <div class="bg-black/20 rounded-2xl p-4 border border-white/5">
                        <div class="flex items-center gap-2 mb-2 opacity-50">
                            <span class="material-symbols-outlined text-xs">chat_bubble</span>
                            <p class="text-[8px] font-black uppercase tracking-widest">Sua Mensagem / Justificativa</p>
                        </div>
                        <p class="text-[11px] text-slate-400 leading-relaxed italic">"${userMsg}"</p>
                    </div>

                    <div class="bg-primary/5 rounded-2xl p-4 border border-primary/10">
                        <div class="flex items-center gap-2 mb-2 text-primary/70">
                            <span class="material-symbols-outlined text-xs font-variation-settings-fill">quick_reference_all</span>
                            <p class="text-[8px] font-black uppercase tracking-widest">Parecer da Gestão</p>
                        </div>
                        <p class="text-[12px] text-slate-100 leading-relaxed italic font-medium">"${adminMsg}"</p>
                    </div>
                </div>
            </div>
        `;
    }
};
