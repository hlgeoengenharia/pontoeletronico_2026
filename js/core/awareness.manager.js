import { supabase } from '../supabase-config.js';

/**
 * AwarenessManager - ChronoSync Core
 * Ponto único de verdade para o estado de 'Ciência' (Visto/Lido) de notificações.
 * Unifica LocalStorage e Supabase para garantir sincronia entre dispositivos e papéis.
 */
export const AwarenessManager = {
    readItems: new Set(),
    initialized: false,

    /**
     * Inicializa o mapa de leitura a partir do cache local e servidor
     */
    async init(userId) {
        if (this.initialized && this.currentUserId === userId) return;
        this.currentUserId = userId;
        this.readItems.clear();

        // 1. Carregar do LocalStorage (Legado + Performance)
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith('ciente_') || key.startsWith('visto_')) {
                // Extrair ID da chave legada
                const id = key.replace('ciente_', '').replace('visto_justificativa_', '').replace('visto_feriado_', '').replace('visto_ferias_analise_', '').replace('visto_', '');
                this.readItems.add(id);
            }
        }

        // 2. Sincronizar com o Servidor (Nova Tabela)
        if (userId) {
            try {
                const { data, error } = await supabase
                    .from('config_notificacoes_lidas')
                    .select('item_id')
                    .eq('funcionario_id', userId);
                
                if (data) {
                    data.forEach(row => {
                        this.readItems.add(row.item_id);
                        // Backfill LocalStorage para consistência offline
                        localStorage.setItem(`ciente_${row.item_id}`, 'true');
                    });
                }
            } catch (e) {
                console.warn('[AwarenessManager] Falha na sincronização server-side:', e);
            }
        }

        this.initialized = true;
        console.log(`[AwarenessManager] Inicializado para ${userId}. ${this.readItems.size} itens lidos mapeados.`);
    },

    /**
     * Verifica se um item já foi visto
     */
    isSeen(id) {
        if (!id) return false;
        const sid = id.toString().toLowerCase();
        return this.readItems.has(sid) || localStorage.getItem(`ciente_${sid}`) === 'true';
    },

    /**
     * Marca um item como visto para o usuário atual
     */
    async markAsSeen(id, type, userId) {
        if (!id) return;
        const itemId = id.toString().toLowerCase();
        const fId = userId || this.currentUserId || localStorage.getItem('userId');

        // 1. Persistência Local (Imediata) - Fornece feedback instantâneo na UI
        this.readItems.add(itemId);
        localStorage.setItem(`ciente_${itemId}`, 'true');

        // 2. Persistência Global (Server-Side)
        if (fId) {
            try {
                // RPC evita erro 500 no console usando "DO NOTHING" interno no banco
                await supabase.rpc('marcar_notificacoes_como_lidas', {
                    p_funcionario_id: fId,
                    p_ids: [itemId],
                    p_tipo: type || 'visto'
                });
            } catch (e) {
                // Silencioso
            }
        }

        // Emitir evento para atualizar badges (Debounced ou Imediato)
        window.dispatchEvent(new CustomEvent('awareness-changed', { detail: { id: itemId, type } }));
    },

    /**
     * Executa a limpeza automática de uma lista de itens baseada em critério autoClear
     */
    async autoClear(items, userId) {
        if (!items || !Array.isArray(items)) return;
        
        const fId = userId || this.currentUserId || localStorage.getItem('userId');
        
        // Expandir grupos (ex: Feriados/Folgas agrupadas por data)
        const expandedItems = [];
        items.forEach(item => {
            if (item.group && Array.isArray(item.group)) {
                expandedItems.push(...item.group);
            } else {
                expandedItems.push(item);
            }
        });

        const toMark = expandedItems.filter(item => {
            const id = item.id || item.item_id;
            return id && !this.isSeen(id);
        });

        if (toMark.length === 0) return;
        
        // 1. Local Update (Batch)
        toMark.forEach(item => {
            const sid = (item.id || item.item_id).toString().toLowerCase();
            this.readItems.add(sid);
            localStorage.setItem(`ciente_${sid}`, 'true');
        });

        // 2. Server Update (Bulk RPC)
        if (fId) {
            try {
                const ids = toMark.map(item => (item.id || item.item_id).toString().toLowerCase());
                await supabase.rpc('marcar_notificacoes_como_lidas', {
                    p_funcionario_id: fId,
                    p_ids: ids,
                    p_tipo: 'auto_clear'
                });
            } catch (e) {
                // Silencioso
            }
        }

        // 3. Notificação única para o sistema
        window.dispatchEvent(new CustomEvent('awareness-changed', { detail: { bulk: true, count: toMark.length } }));
    }
};

window.AwarenessManager = AwarenessManager;
