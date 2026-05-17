/**
 * Atividades History Module - ChronoSync Core
 * Gerencia a renderização de logs de atividades diárias na timeline.
 */
export const AtividadesHistory = {
    render(item, options = {}) {
        const date = new Date(item.created_at || item.data || item.data_hora || new Date());
        
        // Governança de Ações via EventManager
        let actionButtons = '';
        const canEdit = window.EventManager ? window.EventManager.canEdit(item, options) : false;

        const icon = 'edit_note';
        const accentClass = 'bg-primary/10 text-primary border-primary/20';
        const accentBorder = 'border-l-primary';

        const isEditing = options.editingId === item.id;
        let contentHtml = '';

        let rawContent = item.conteudo || item.content || '';
        let geoTag = '';
        const geoTagMatch = rawContent.match(/\|GEO:([^|]+)\|/);
        if (geoTagMatch) {
            geoTag = geoTagMatch[0];
            rawContent = rawContent.replace(geoTag, '').trim();
        }

        if (isEditing) {
            contentHtml = `
                <div class="space-y-3">
                    <textarea id="edit-content-${item.id}" 
                        class="w-full bg-black/40 border border-primary/30 rounded-xl p-3 text-[11px] text-slate-200 focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all font-medium min-h-[80px]"
                        placeholder="Descreva a atividade...">${rawContent}</textarea>
                    <input type="hidden" id="edit-geo-${item.id}" value="${geoTag}">
                </div>
            `;
            actionButtons = `
                <div class="flex gap-2 justify-end pt-2 border-t border-white/5 mt-3">
                    <button onclick="window.cancelarEdicaoInline()" 
                        class="h-8 px-4 bg-white/5 border border-white/10 rounded-lg text-slate-500 hover:bg-white/10 transition-all text-[8px] font-black uppercase tracking-widest">
                        Cancelar
                    </button>
                    <button onclick="window.salvarEdicaoInline('${item.id}', 'atividade')" 
                        class="h-8 px-5 bg-primary/20 border border-primary/40 rounded-lg text-primary hover:bg-primary hover:text-white transition-all text-[8px] font-black uppercase tracking-widest shadow-lg shadow-primary/10">
                        Salvar Alterações
                    </button>
                </div>
            `;
        } else {
            let displayContent = item.conteudo || item.content || '';
            let lat = item.latitude;
            let lng = item.longitude;

            const geoMatch = displayContent.match(/\|GEO:([^,]+),([^|]+)\|/);
            if (geoMatch) {
                lat = parseFloat(geoMatch[1]);
                lng = parseFloat(geoMatch[2]);
                displayContent = displayContent.replace(geoMatch[0], '').trim();
            }

            let mapHtml = '';
            if (lat && lng) {
                const mapUrl = `https://static-maps.yandex.ru/1.x/?lang=pt-BR&ll=${lng},${lat}&z=16&l=sat,skl&size=400,200&pt=${lng},${lat},pm2blm`;
                const gmapsLink = `https://www.google.com/maps?q=${lat},${lng}`;
                mapHtml = `
                    <a href="${gmapsLink}" target="_blank" class="block mt-3 relative rounded-xl overflow-hidden border border-white/10 h-32 w-full group/map shadow-md cursor-pointer">
                        <img src="${mapUrl}" class="w-full h-full object-cover transition-transform duration-500 group-hover/map:scale-110" alt="Localização Satélite">
                        <div class="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent group-hover/map:from-black/70 transition-all"></div>
                        <div class="absolute bottom-2 left-2 flex items-center gap-2">
                            <div class="size-6 rounded-full bg-blue-500/20 backdrop-blur-md border border-blue-500/50 flex items-center justify-center text-blue-500 animate-pulse">
                                <span class="material-symbols-outlined text-[12px]">my_location</span>
                            </div>
                            <span class="text-[9px] font-black uppercase text-white tracking-widest drop-shadow-md">Ver no Mapa</span>
                        </div>
                    </a>
                `;
            }

            contentHtml = `
                <div class="bg-black/20 rounded-xl p-3 border border-white/5">
                    <p class="text-[11px] text-slate-300 leading-relaxed font-medium opacity-90">${displayContent || 'Nenhuma descrição informada.'}</p>
                </div>
                ${mapHtml}
            `;
            if (canEdit && !options.hideActions) {
                actionButtons = `
                    <div class="flex gap-2 justify-end pt-1.5 border-t border-white/5 mt-3">
                        <button onclick="window.prepararEdicaoInline('${item.id}')" 
                            class="h-8 px-3 bg-white/5 border border-white/10 rounded-lg text-slate-400 hover:bg-primary/20 hover:text-primary transition-all flex items-center gap-2 text-[8px] font-black uppercase tracking-widest shadow-sm">
                            <span class="material-symbols-outlined text-xs">edit</span>
                            <span>Editar</span>
                        </button>
                        <button onclick="window.excluirItemHistorico('${item.id}')" 
                            class="h-8 px-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-500 hover:bg-rose-500 hover:text-white transition-all flex items-center gap-2 text-[8px] font-black uppercase tracking-widest shadow-sm">
                            <span class="material-symbols-outlined text-xs">delete</span>
                            <span>Excluir</span>
                        </button>
                    </div>
                `;
            }
        }

        // --- MODO SLIM (Para Espelho de Ponto / Histórico) ---
        if (options.isSlim) {
            return `
                <div id="card-slim-${item.id}" class="bg-white/[0.03] border border-white/5 rounded-xl p-2.5 flex items-start gap-3 border-l-4 ${accentBorder} group/slim hover:bg-white/5 transition-all">
                    <div class="size-6 rounded-lg ${accentClass} flex items-center justify-center border shadow-sm shrink-0">
                        <span class="material-symbols-outlined text-[14px]">${icon}</span>
                    </div>
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center justify-between mb-0.5">
                            <h5 class="text-[8px] font-black uppercase tracking-widest text-slate-500 italic">ATIVIDADE</h5>
                            <span class="text-[7px] font-bold text-slate-600">${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <p class="text-[10px] text-slate-300 leading-tight italic line-clamp-2">"${item.conteudo || item.content || '...'}"</p>
                    </div>
                </div>
            `;
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
                    ${!canEdit && !isEditing ? `
                        <span class="material-symbols-outlined text-[12px] text-slate-600" title="Histórico Permanente">lock</span>
                    ` : ''}
                </div>

                ${contentHtml}
                
                ${actionButtons}
            </div>
        `;
    }
};
