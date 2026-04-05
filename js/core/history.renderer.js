import { EventRegistry } from './event.registry.js';

/**
 * HistoryRenderer - ChronoSync Core
 * Motor de renderização universal para a timeline de eventos.
 */
export const HistoryRenderer = {
    /**
     * Renderiza uma lista de itens de histórico
     * @param {Array} items Lista de itens consolidados
     * @param {object} options Opções de renderização (ex: isAdmin)
     * @returns {string} HTML string final
     */
    renderList(items, options = {}) {
        if (!items || items.length === 0) {
            return `<p class="text-[9px] text-slate-600 uppercase text-center py-10 italic tracking-widest">Nenhuma transmissão registrada</p>`;
        }

        return items.map(item => {
            const provider = EventRegistry.getProvider(item.tipo);
            
            if (provider && provider.history) {
                return provider.history.render(item, options);
            }

            // Fallback para tipos genéricos não mapeados
            return this.renderFallback(item);
        }).join('');
    },

    /**
     * Template de fallback para tipos desconhecidos
     */
    renderFallback(item) {
        return `
            <div class="bg-white/5 border border-white/5 rounded-2xl p-4 opacity-50 grayscale">
                <p class="text-[8px] font-black uppercase text-slate-500 tracking-widest mb-1">Evento Desconhecido: ${item.tipo}</p>
                <p class="text-[10px] text-slate-400 font-medium italic">"${item.content || '(Sem conteúdo)'}"</p>
            </div>
        `;
    }
};
