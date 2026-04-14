/**
 * Ponto History Module - ChronoSync Core
 * Renderizador de cards de batida (Check-in/Out) na timeline do Diário.
 */
export const PontoHistory = {
    render(item, options = {}) {
        const date = new Date(item.time || item.data_hora);
        const content = (item.content || '').toUpperCase();
        const isCheckin = item.tipo === 'ENTRADA' || content.includes('CHECK-IN') || content.includes('ENTRADA');
        const icon = isCheckin ? 'login' : 'logout';
        
        const status = (item.status || 'pendente').toLowerCase();
        
        // Cores e Labels baseadas no Status de Abono
        let statusClass = 'bg-amber-500/10 text-amber-500 border-amber-500/20';
        let accentBorder = isCheckin ? 'border-l-emerald-500' : 'border-l-rose-500';
        let statusLabel = 'AGUARDANDO ANÁLISE';

        if (status === 'abonado' || status === 'aprovado') {
            statusClass = 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
            statusLabel = 'ABONADO / VALIDADO';
        } else if (status === 'rejeitado' || status === 'negado') {
            statusClass = 'bg-rose-500/20 text-rose-400 border-rose-500/30';
            statusLabel = 'REJEITADO / IRREGULAR';
            accentBorder = 'border-l-rose-600';
        }

        const colorClass = isCheckin ? 'text-emerald-500 bg-emerald-500/10' : 'text-rose-500 bg-rose-500/10';
        const borderClass = isCheckin ? 'border-emerald-500/20' : 'border-rose-500/20';
        
        return `
            <div class="group relative bg-[#0f1115] border border-white/5 rounded-[2.5rem] p-6 border-l-4 ${accentBorder} hover:border-white/10 transition-all duration-300 shadow-2xl overflow-hidden mb-4">
                <!-- Background Glow -->
                <div class="absolute -right-10 -top-10 size-48 ${status === 'rejeitado' ? 'bg-rose-500/5' : (isCheckin ? 'bg-emerald-500/5' : 'bg-rose-500/5')} blur-[80px] rounded-full pointer-events-none"></div>

                <div class="flex items-start gap-5">
                    <div class="size-14 rounded-2xl ${colorClass} border ${borderClass} flex items-center justify-center shrink-0 shadow-lg">
                        <span class="material-symbols-outlined text-3xl font-variation-settings-fill">${icon}</span>
                    </div>

                    <div class="flex-1 min-w-0">
                        <div class="flex items-center justify-between mb-3">
                            <div class="flex flex-col gap-1">
                                <h4 class="text-[11px] font-black text-slate-100 uppercase tracking-[0.2em] italic leading-none">
                                    ${isCheckin ? 'Check-in Fora do Raio' : 'Check-out Fora do Raio'}
                                </h4>
                                <div class="flex items-center gap-2 mt-1">
                                    <span class="px-2 py-0.5 rounded border ${statusClass} text-[7px] font-black uppercase tracking-widest">${statusLabel}</span>
                                    <span class="text-[9px] font-bold text-slate-500 uppercase tracking-tighter bg-white/5 px-2 py-1 rounded-lg">
                                        ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <!-- Justificativa do Funcionário -->
                        <div class="bg-black/40 rounded-2xl p-4 border border-white/5 shadow-inner mb-4">
                            <p class="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                                <span class="material-symbols-outlined text-[10px]">person</span>
                                Justificativa do Colaborador
                            </p>
                            <p class="text-[11px] text-slate-300 leading-relaxed italic font-medium opacity-90">
                                "${item.justificativa_usuario || 'Nenhuma justificativa detalhada foi fornecida.'}"
                            </p>
                        </div>

                        <!-- Parecer da Gestão (Se houver) -->
                        ${item.admin_feedback ? `
                            <div class="bg-primary/10 border border-primary/20 rounded-2xl p-4 animate-in slide-in-from-top-2 duration-300">
                                <div class="flex items-center gap-2 mb-2">
                                    <span class="material-symbols-outlined text-primary text-sm font-variation-settings-fill">quick_reference_all</span>
                                    <p class="text-[8px] font-black uppercase tracking-widest text-primary">Parecer da Gestão</p>
                                </div>
                                <p class="text-[11px] text-slate-200 leading-relaxed font-medium italic">"${item.admin_feedback}"</p>
                            </div>
                        ` : status === 'pendente' ? `
                             <div class="flex items-center gap-2 p-3 bg-white/5 rounded-xl border border-dashed border-white/10 opacity-60">
                                <span class="material-symbols-outlined text-slate-500 text-sm">schedule</span>
                                <p class="text-[9px] text-slate-500 uppercase font-bold tracking-widest">Aguardando análise administrativa</p>
                             </div>
                        ` : ''}

                        <div class="mt-4 flex items-center justify-between py-2 border-t border-white/5">
                            <div class="flex items-center gap-2">
                                <span class="material-symbols-outlined text-xs text-rose-500">location_off</span>
                                <span class="text-[8px] font-black text-slate-500 uppercase tracking-widest">
                                    ${item.distancia_metros ? `${Math.round(item.distancia_metros)}m fora da zona permitida` : 'Divergência de Localização'}
                                </span>
                            </div>
                            
                            ${item.evidencia_url ? `
                                <button onclick="window.open('${item.evidencia_url}', '_blank')" class="flex items-center gap-1.5 text-amber-500 hover:text-amber-400 transition-colors">
                                    <span class="material-symbols-outlined text-xs">attach_file</span>
                                    <span class="text-[8px] font-black uppercase">Ver Anexo</span>
                                </button>
                            ` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
};
