import { supabase } from './supabase-config.js';
import { DiarioAggregator } from './core/diario.aggregator.js';
import { AwarenessManager } from './core/awareness.manager.js';

/**
 * Módulo Notifications - Projeto V01
 * Gerencia a contagem de badges (Sino e Diário).
 */
const Notifications = {
    initialized: false,
    currentTargetId: null,

    async updateBadges(targetUserId = null) {
        if (targetUserId) this.currentTargetId = targetUserId;
        
        const sessionUserId = localStorage.getItem('userId');
        const userRole = localStorage.getItem('userRole');
        const userId = targetUserId || this.currentTargetId || sessionUserId;

        if (!userId) return;

        // Garantir Awareness inicializado para o alvo
        await AwarenessManager.init(userId);

        const role = (userRole || '').toLowerCase();
        const isManagement = role === 'admin' || role === 'gestor' || role === 'manager';
        
        try {
            const { data: userData } = await supabase.from('funcionarios').select('setor_id').eq('id', userId).maybeSingle();
            const sectorId = userData?.setor_id || '00000000-0000-0000-0000-000000000000';

            // 1. Contagem do Sino (Gestão)
            let sinoCount = 0;
            if (isManagement) {
                const [resJust, resFer, resLogs] = await Promise.all([
                    supabase.from('justificativas').select('id').eq('status', 'pendente'),
                    supabase.from('ferias').select('funcionario_id').eq('status', 'pendente'),
                    supabase.from('diario_logs').select('id').eq('status_pendencia', 'pendente').not('tipo', 'in', '("comunicado","justificativa_resultado","aviso_ferias")')
                ]);

                // Deduplicação de Férias: Contar funcionários únicos com solicitações pendentes
                const uniqueFeriasEmployees = new Set((resFer.data || []).map(f => f.funcionario_id)).size;
                
                // Sino Geral passa a contar apenas Justificativas e Logs (Sem Férias p/ evitar redundância)
                sinoCount = (resJust.data?.length || 0) + (resLogs.data?.length || 0);

                // 2. Contagem do Diário (Alvo) via Aggregator (Awareness Aware)
                const aggregatorResult = await DiarioAggregator.fetchAndAggregate(supabase, userId, sectorId);
                const diarioCount = aggregatorResult.total;
                
                // 3. Atualizar UI
                this.setBadge('notif-badge', sinoCount);
                this.setBadge('badge-sino', sinoCount);
                this.setBadge('badge-diario', diarioCount);
                this.setBadge('badge-diario-footer', diarioCount);

                // 4. Sincronização de Férias (Dashboard + Sidebar Gestão)
                this.setBadge('stat-ferias-mes', uniqueFeriasEmployees);
                this.setBadge('badge-ferias-sidebar', uniqueFeriasEmployees);
                
                console.log(`[Notifications] Badges Atualizados (Alvo ${userId}): Sino=${sinoCount}, Diário=${diarioCount}, Férias=${uniqueFeriasEmployees}`);
            } else {
                // Lógica p/ Funcionários: Contar apenas respostas de justificativas pendentes de ciência
                const { data: juData } = await supabase.from('justificativas').select('id').eq('funcionario_id', userId).eq('status', 'pendente');
                sinoCount = (juData?.length || 0);

                // 2. Contagem do Diário (Alvo) via Aggregator (Awareness Aware)
                const aggregatorResult = await DiarioAggregator.fetchAndAggregate(supabase, userId, sectorId);
                const diarioCount = aggregatorResult.total;

                // 3. Atualizar UI
                this.setBadge('notif-badge', sinoCount);
                this.setBadge('badge-sino', sinoCount);
                this.setBadge('badge-diario', diarioCount);
                this.setBadge('badge-diario-footer', diarioCount);
            }
        } catch (e) {
            console.error('[Notifications] Falha na atualização:', e);
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

    init(targetId = null) {
        if (this.initialized && this.currentTargetId === targetId) return;
        this.initialized = true;
        this.currentTargetId = targetId;

        this.updateBadges(targetId);

        // Refresh periódico e escuta do barramento global de consciência
        setInterval(() => this.updateBadges(this.currentTargetId), 60000);
        window.addEventListener('awareness-changed', () => this.updateBadges(this.currentTargetId));

        // Inscrição Supabase Realtime
        supabase.channel('realtime-notifications')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'comunicados' }, () => this.updateBadges())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'justificativas' }, () => this.updateBadges())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'diario_logs' }, () => this.updateBadges())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'ferias' }, () => {
                this.updateBadges();
                window.dispatchEvent(new CustomEvent('sync-ferias-stats'));
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'feriados_folgas' }, () => {
                this.updateBadges();
                window.dispatchEvent(new CustomEvent('sync-feriados'));
            })
            .subscribe();
    }
};

window.Notifications = Notifications;
export { Notifications };
