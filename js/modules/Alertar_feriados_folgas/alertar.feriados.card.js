/**
 * AlertarFeriadosCard - ChronoSync Premium
 * Renderiza o card de alerta mensal para Admin/Gestores.
 */
export const AlertarFeriadosCard = {
    render(item) {
        const icon = 'calendar_month';
        const title = 'ALERTA DE GESTÃO';
        const message = 'ATENÇÃO: Atualizar e aprovar os feriados e folgas do mês.';
        
        return `
            <div id="card-alerta-${item.id}" class="flex flex-col rounded-3xl bg-slate-900 border border-primary/20 p-6 shadow-[0_10px_40px_rgba(13,89,242,0.15)] relative overflow-hidden group animate-in zoom-in-95 duration-500">
                <!-- Efeito Glassmorphism/Premium -->
                <div class="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-neon-cyan to-primary opacity-80"></div>
                
                <div class="flex items-start gap-4 mb-5">
                    <div class="size-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-inner group-hover:scale-110 transition-transform duration-500">
                        <span class="material-symbols-outlined text-3xl font-variation-settings-fill">${icon}</span>
                    </div>
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-2 mb-1">
                            <h3 class="text-[10px] font-black uppercase tracking-[0.3em] text-primary">SISTEMA CHRONOSYNC</h3>
                            <span class="px-2 py-0.5 rounded bg-primary/20 text-primary text-[8px] font-black uppercase border border-primary/30">RECORRENTE</span>
                        </div>
                        <h2 class="text-slate-100 font-black text-xs uppercase tracking-tight leading-tight">${title}</h2>
                    </div>
                </div>

                <div class="bg-black/30 rounded-2xl p-5 border border-white/5 mb-6">
                    <p class="text-slate-200 text-xs font-bold leading-relaxed tracking-tight italic">
                        "${message}"
                    </p>
                    <div class="mt-4 flex items-center gap-2">
                         <span class="size-1.5 rounded-full bg-primary animate-pulse"></span>
                         <p class="text-[9px] font-black uppercase tracking-widest text-slate-500">Ação obrigatória mensal para integridade das escalas</p>
                    </div>
                </div>

                <div class="grid grid-cols-2 gap-4">
                    <button onclick="window.AlertarFeriadosActions.resolverAlerta('${item.id}')"
                        class="h-12 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 text-slate-400 text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 group">
                        <span class="material-symbols-outlined text-lg group-hover:scale-125 transition-transform">check_circle</span>
                        <span>OK, ENTENDIDO</span>
                    </button>
                    <button onclick="window.AlertarFeriadosActions.irParaFeriados()"
                        class="h-12 rounded-xl bg-primary text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20 transition-all hover:brightness-110 hover:scale-[1.02] flex items-center justify-center gap-2">
                        <span class="material-symbols-outlined text-lg">calendar_today</span>
                        <span>CLIQUE AQUI E VÁ</span>
                    </button>
                </div>

                <!-- Marca d'água discreta -->
                <span class="absolute -bottom-4 -right-4 material-symbols-outlined text-7xl text-white/[0.02] -rotate-12 pointer-events-none">warning</span>
            </div>
        `;
    }
};

window.AlertarFeriadosCard = AlertarFeriadosCard;
