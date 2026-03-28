import { supabase } from './supabase-config.js';
import { EventManager } from './event-manager.js';

/**
 * Módulo Notifications - Projeto V01
 * Gerencia a contagem de badges (Sino e Diário) de forma global.
 */
export const Notifications = {
    async updateBadges() {
        const userId = localStorage.getItem('userId');
        const userRole = localStorage.getItem('userRole');
        if (!userId) return;

        try {
            // A. Justificativas e Pendências (Badge Sino)
            let sinoCount = 0;
            const role = (userRole || '').toLowerCase();
            
            try {
                if (role === 'admin' || role === 'gestor' || role === 'manager') {
                    const { count } = await supabase.from('justificativas').select('id', { count: 'exact', head: true }).eq('status', 'pendente');
                    sinoCount = count || 0;
                } else {
                    const [resJust, resLogs] = await Promise.all([
                        supabase.from('justificativas').select('id', { count: 'exact', head: true }).eq('funcionario_id', userId).eq('status', 'pendente'),
                        supabase.from('diario_logs').select('id', { count: 'exact', head: true }).eq('funcionario_id', userId).eq('status_pendencia', 'pendente')
                            .not('tipo', 'in', '("comunicado","aviso_ferias")')
                    ]);
                    sinoCount = (resJust.count || 0) + (resLogs.count || 0);
                }
            } catch (e) { console.warn('[Notifications] Erro ao carregar contagem do Sino:', e); }

            // B. Comunicados e Feriados (Badge Diário)
            let diarioCount = 0;
            try {
                const { data: user } = await supabase.from('funcionarios').select('setor_id').eq('id', userId).maybeSingle();
                const sectorId = user?.setor_id || '00000000-0000-0000-0000-000000000000';

                const [resComs, resLogs, resFer, resJustProcessed] = await Promise.all([
                    supabase.from('comunicados').select('id, subtipo, lido').or(`destinatario_id.eq.${userId},tipo.eq.geral,setor_id.eq.${sectorId}`),
                    supabase.from('diario_logs').select('id, tipo').eq('funcionario_id', userId).in('tipo', ['comunicado', 'aviso_ferias']).eq('status_pendencia', 'pendente'),
                    supabase.from('feriados_folgas').select('id').or(`funcionario_id.eq.${userId},setor_id.eq.${sectorId},escopo.eq.geral`),
                    supabase.from('justificativas').select('id, status').eq('funcionario_id', userId).neq('status', 'pendente')
                ]);

                const itemsCC = (resComs.data || []).filter(c => {
                    const isSeen = c.lido || localStorage.getItem(`ciente_${c.id}`);
                    const config = EventManager.getConfig({ itemType: 'COMUNICADO', ...c });
                    return !isSeen || !config.autoClear;
                });
                const cC = itemsCC.length;

                const itemsCL = (resLogs.data || []).filter(l => {
                    const isSeen = localStorage.getItem(`visto_${l.id}`);
                    const config = EventManager.getConfig({ itemType: 'SISTEMA', ...l });
                    return !isSeen || !config.autoClear;
                });
                const cL = itemsCL.length;

                const itemsCF = (resFer.data || []).filter(f => {
                    const isSeen = localStorage.getItem(`visto_feriado_${f.id}`);
                    return !isSeen;
                });
                const cF = itemsCF.length;

                const itemsCJ = (resJustProcessed.data || []).filter(j => {
                    const isSeen = localStorage.getItem(`visto_justificativa_${j.id}`);
                    return !isSeen;
                });
                const cJ = itemsCJ.length;

                diarioCount = cC + cL + cF + cJ;
                console.log(`[Notifications] Badge Diário: ${diarioCount} (Comums:${cC}, Logs:${cL}, Fers:${cF}, Just:${cJ})`);
                if (cC > 0) console.log('[Notifications] IDs Comunicados Pendentes:', itemsCC.map(i => i.id + ' (' + i.subtipo + ')'));
            } catch (e) { console.warn('[Notifications] Erro ao carregar contagem do Diário:', e); }

            // C. Atualização da UI
            this.setBadge('notif-badge', sinoCount);
            this.setBadge('notif-badge-footer', diarioCount);
            this.setBadge('badge-sino', sinoCount);
            this.setBadge('badge-diario', diarioCount);

            const sinoIcon = document.getElementById('sino-icon');
            if (sinoIcon) {
                if (sinoCount > 0) sinoIcon.classList.add('text-amber-500'), sinoIcon.classList.remove('text-slate-400');
                else sinoIcon.classList.remove('text-amber-500'), sinoIcon.classList.add('text-slate-400');
            }
        } catch (err) {
            console.error('[Notifications] Falha crítica no processamento de badges:', err);
        }
    },

    setBadge(id, count) {
        const el = document.getElementById(id);
        if (!el) return;
        
        if (count > 0) {
            el.innerText = count > 99 ? '99+' : count;
            el.classList.remove('hidden');
        } else {
            el.classList.add('hidden');
        }
    },

    init() {
        console.log('[Notifications] Inicializando motor de alertas...');
        this.updateBadges();
        
        // 1. Polling de backup (60s)
        setInterval(() => this.updateBadges(), 60000);

        // 2. Realtime para atualização instantânea
        const channel = supabase.channel('realtime-notifications')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'comunicados' }, () => this.updateBadges())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'justificativas' }, () => this.updateBadges())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'diario_logs' }, () => this.updateBadges())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'feriados_folgas' }, () => {
                this.updateBadges();
                // Dispara evento global para o Dashboard atualizar o calendário
                window.dispatchEvent(new CustomEvent('sync-feriados'));
            })
            .subscribe((status) => {
                console.log('[Notifications] Status do Realtime:', status);
            });
    }
};

// Auto-inicialização
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => Notifications.init());
} else {
    Notifications.init();
}
