/**
 * JustificativaHistory - ChronoSync Module
 * Renderizador de cartões de justificativas enviadas pelo tripulante.
 */
export const JustificativaHistory = {
    render(item, options = {}) {
        const date = item.time ? new Date(item.time).toLocaleDateString('pt-BR') : '';
        const time = item.time ? new Date(item.time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '';
        const content = item.content || item.descricao || '(Sem descrição)';
        const status = (item.status || 'pendente').toUpperCase();
        
        const isApproved = status === 'APROVADO';
        const isRejected = status === 'REJEITADO';
        const statusColor = isApproved ? 'text-emerald-500' : (isRejected ? 'text-rose-500' : 'text-amber-500');
        const statusBg = isApproved ? 'bg-emerald-500/10' : (isRejected ? 'bg-rose-500/10' : 'bg-amber-500/10');

        let actionButtons = '';
        if (options.isAdmin) {
            actionButtons = `
                <div class="flex gap-2 pt-2">
                    <button onclick="window.editarAnotacao('${item.id}', 'justificativa')" class="flex-1 py-2 bg-primary/10 border border-primary/20 text-primary text-[9px] font-black uppercase rounded-lg hover:bg-primary/20">Editar</button>
                    <button onclick="window.excluirAnotacao('${item.id}', 'justificativa')" class="flex-1 py-2 bg-rose-500/10 border border-rose-500/20 text-rose-500 text-[9px] font-black uppercase rounded-lg hover:bg-rose-500/20">Excluir</button>
                </div>
            `;
        }

        return `
            <div class="glass-panel rounded-2xl p-4 border-l-4 border-amber-500/50 mb-3 animate-in slide-in-from-right duration-500">
                <div class="flex justify-between items-start mb-2">
                    <div class="flex items-center gap-2">
                        <span class="material-symbols-outlined text-amber-500 text-lg">fact_check</span>
                        <div>
                            <p class="text-[10px] font-black text-white uppercase tracking-widest">JUSTIFICATIVA ENVIADA</p>
                            <p class="text-[8px] text-slate-500 font-bold uppercase">${date} às ${time}</p>
                        </div>
                    </div>
                    <span class="px-2 py-0.5 rounded-full text-[7px] font-black tracking-tighter ${statusBg} ${statusColor}">${status}</span>
                </div>
                <p class="text-[11px] text-slate-300 font-medium leading-relaxed italic border-l border-white/5 pl-3 py-1 mb-2">
                    "${content}"
                </p>
                ${actionButtons}
            </div>
        `;
    }
};
