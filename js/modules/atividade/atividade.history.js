/**
 * AtividadeHistory - ChronoSync Module
 * Renderizador de cartões de atividades registradas pelo tripulante.
 */
export const AtividadeHistory = {
    render(item, options = {}) {
        const date = item.time ? new Date(item.time).toLocaleDateString('pt-BR') : '';
        const time = item.time ? new Date(item.time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '';
        const content = item.content || item.anotacao || '(Sem descrição)';

        let actionButtons = '';
        if (options.isAdmin) {
            actionButtons = `
                <div class="flex gap-2 pt-2">
                    <button onclick="window.editarAnotacao('${item.id}', 'atividade')" class="flex-1 py-1.5 bg-primary/10 border border-primary/20 text-primary text-[8px] font-black uppercase rounded-lg hover:bg-primary/20 transition-colors">Editar</button>
                    <button onclick="window.excluirAnotacao('${item.id}', 'atividade')" class="flex-1 py-1.5 bg-rose-500/10 border border-rose-500/20 text-rose-500 text-[8px] font-black uppercase rounded-lg hover:bg-rose-500/20 transition-colors">Excluir</button>
                </div>
            `;
        }

        return `
            <div class="glass-panel rounded-2xl p-4 border-l-4 border-primary/50 mb-3 animate-in slide-in-from-right duration-500">
                <div class="flex justify-between items-start mb-2">
                    <div class="flex items-center gap-2">
                        <span class="material-symbols-outlined text-primary text-lg">edit_note</span>
                        <div>
                            <p class="text-[10px] font-black text-white uppercase tracking-widest leading-none">ATIVIDADE REGISTRADA</p>
                            <p class="text-[8px] text-slate-500 font-bold uppercase mt-1 tracking-tighter">${date} às ${time}</p>
                        </div>
                    </div>
                </div>
                <div class="bg-white/5 p-3 rounded-xl border border-white/5 shadow-inner">
                    <p class="text-[11px] text-slate-200 font-medium leading-relaxed">
                        ${content}
                    </p>
                </div>
                ${actionButtons}
            </div>
        `;
    }
};
