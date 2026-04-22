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
                const [resJust, resFer, resPonto, resLogs] = await Promise.all([
                    supabase.from('justificativas').select('id').eq('status', 'pendente').gt('data_incidente', '2001-01-01'),
                    supabase.from('ferias').select('funcionario_id').eq('status', 'pendente').gt('created_at', '2001-01-01'),
                    supabase.from('pontos').select('id').eq('status_validacao', 'pendente').gt('created_at', '2001-01-01'),
                    supabase.from('diario_logs').select('id').eq('status_pendencia', 'pendente')
                        .not('tipo', 'in', '("comunicado","justificativa_resultado","gps_pulse")')
                        .neq('tipo', 'aviso_ferias')
                        .gt('data_hora', '2001-01-01')
                ]);

                const uniqueFeriasEmployees = new Set((resFer.data || []).map(f => f.funcionario_id)).size;
                
                // Sino Gestão: Total de pendências para analisar
                sinoCount = (resJust.data?.length || 0) + (resPonto.data?.length || 0) + (resLogs.data?.length || 0);

                // 2. Contagem do Diário: Apenas logs pessoais (resultados, comunicados, etc.)
                const aggregatorResult = await DiarioAggregator.fetchAndAggregate(supabase, userId, sectorId);
                const diarioCount = aggregatorResult.total;
                
                // 3. Atualizar UI
                this.setBadge('notif-badge', sinoCount);
                this.setBadge('badge-sino', sinoCount);
                this.setBadge('badge-diario', diarioCount);
                this.setBadge('badge-diario-footer', diarioCount);

                this.setBadge('stat-ferias-mes', uniqueFeriasEmployees);
                this.setBadge('badge-ferias-sidebar', uniqueFeriasEmployees);
                
                console.log(`[Notifications] Badges Atualizados (Gestor ${userId}): Sino=${sinoCount}, Diário=${diarioCount}`);
            } else {
                // Lógica p/ Funcionários: O Sino não deve mostrar pendências de abono, pois ele já sabe que enviou.
                // O Sino pode ser usado para outros fins (ex: mensagens urgentes), mas por ora deixamos zerado ou para comunicados.
                sinoCount = 0; 

                // 2. Contagem do Diário: Mostra resultados analisados via Aggregator
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
        // Se já inicializado e o ID alvo for o mesmo, não faz nada
        if (this.initialized && this.currentTargetId === targetId) return;

        // Se já inicializado mas o ID mudou, apenas atualiza o ID e as badges, sem refazer o Realtime
        if (this.initialized) {
            this.currentTargetId = targetId;
            this.updateBadges(targetId);
            return;
        }

        this.initialized = true;
        this.currentTargetId = targetId;

        this.updateBadges(targetId);

        // Refresh periódico e escuta do barramento global de consciência
        setInterval(() => this.updateBadges(this.currentTargetId), 60000);
        window.addEventListener('awareness-changed', () => this.updateBadges(this.currentTargetId));

        // Inscrição Supabase Realtime (Apenas UMA vez na vida do objeto)
        const channel = supabase.channel('realtime-notifications')
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
            });
            
        channel.subscribe();
    }
};

window.Notifications = Notifications;
export { Notifications };
