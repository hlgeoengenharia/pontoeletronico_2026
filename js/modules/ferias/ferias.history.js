/**
 * Ferias History Module - ChronoSync Core
 * Gerencia a renderização de cards de planejamento de férias (Cronograma).
 */
export const FeriasHistory = {
    render(item, options = {}) {
        // O item aqui é um agrupamento de parcelas (CRONOGRAMA_FERIAS)
        const parcelas = item.parcelas || [];
        if (!parcelas.length) return '';

        const status = (item.status || 'pendente').toLowerCase();
        const isVisto = localStorage.getItem(`visto_ferias_analise_${item.funcionario_id}`) === 'true';
        
        let statusClass = 'bg-amber-500/10 text-amber-500 border-amber-500/20';
        let accentBorder = 'border-l-amber-500';
        let statusLabel = 'PLANEJAMENTO PENDENTE';
        let cardBg = isVisto ? 'bg-white/5' : 'bg-sky-500/5';

        if (status === 'aprovado') {
            statusClass = 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
            accentBorder = 'border-l-emerald-500';
            statusLabel = 'CRONOGRAMA CONSOLIDADO';
        } else if (status === 'rejeitado') {
            statusClass = 'bg-rose-500/10 text-rose-500 border-rose-500/20';
            accentBorder = 'border-l-rose-500';
            statusLabel = 'NECESSITA AJUSTES';
        }

        const canEdit = status === 'pendente' || status === 'rejeitado';

        return `
            <div class="${cardBg} border border-white/5 rounded-2xl p-5 premium-border-sky shadow-lg relative border-l-4 ${accentBorder} transition-all hover:bg-white/10 group">
                <div class="flex justify-between items-start mb-4">
                    <div class="flex items-center gap-3">
                        <div class="size-8 rounded-full bg-sky-500/10 flex items-center justify-center border border-sky-500/20">
                            <span class="material-symbols-outlined text-[18px] text-sky-500 font-variation-settings-fill">beach_access</span>
                        </div>
                        <div>
                            <h6 class="text-[11px] font-black uppercase tracking-widest text-white leading-none">CRONOGRAMA DE FÉRIAS</h6>
                            <p class="text-[8px] font-bold text-slate-500 uppercase tracking-widest mt-1">PROGRAMAÇÃO ANUAL</p>
                        </div>
                    </div>
                    <span class="px-2 py-0.5 rounded-lg border text-[8px] font-black uppercase ${statusClass}">${statusLabel}</span>
                </div>

                <div class="space-y-3 mb-5">
                    ${parcelas.map(f => `
                        <div class="bg-black/20 border border-white/5 rounded-xl p-4 transition-all hover:border-white/10 group">
                            <p class="text-[8px] font-black text-sky-400 uppercase tracking-widest mb-2">${f.parcela_numero}ª PARCELA DE FÉRIAS</p>
                            <div class="grid grid-cols-3 items-center">
                                <div>
                                    <p class="text-[7px] font-bold text-slate-500 uppercase mb-0.5">Início</p>
                                    <p class="text-[10px] font-black text-slate-200">${new Date(f.data_inicio + 'T12:00:00').toLocaleDateString('pt-BR')}</p>
                                </div>
                                <div class="text-center border-x border-white/5">
                                    <p class="text-[7px] font-bold text-slate-500 uppercase mb-0.5">Fim</p>
                                    <p class="text-[10px] font-black text-slate-200">${new Date(f.data_fim + 'T12:00:00').toLocaleDateString('pt-BR')}</p>
                                </div>
                                <div class="text-right">
                                    <p class="text-[7px] font-bold text-slate-500 uppercase mb-0.5">Duração</p>
                                    <p class="text-[10px] font-black text-amber-500">${this.calculateDays(f.data_inicio, f.data_fim)} DIAS</p>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>

                <div class="flex gap-2">
                    <button onclick="window.abrirModalFerias()" 
                        class="flex-1 flex items-center justify-center gap-2 py-4 bg-white/5 hover:bg-white/10 rounded-2xl transition-all border border-white/5 text-[9px] font-black text-amber-500 uppercase tracking-widest group">
                        <span class="material-symbols-outlined text-sm group-hover:scale-110 transition-transform">edit</span> 
                        ${canEdit ? 'Alterar Planejamento' : 'Ver Detalhes'}
                    </button>
                    ${status === 'aprovado' ? `
                         <button class="px-6 flex items-center justify-center bg-emerald-500/10 text-emerald-500 rounded-2xl border border-emerald-500/20 hover:bg-emerald-500 hover:text-white transition-all">
                            <span class="material-symbols-outlined text-sm">print</span>
                         </button>
                    ` : ''}
                </div>
            </div>
        `;
    },

    calculateDays(start, end) {
        const s = new Date(start);
        const e = new Date(end);
        return Math.ceil(Math.abs(e - s) / (1000 * 60 * 60 * 24)) + 1;
    }
};
