import { supabase } from './supabase-config.js';

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
            // 1. Justificativas e Pendências (Badge Sino)
            let sinoCount = 0;
            const role = (userRole || '').toLowerCase();
            if (role === 'admin' || role === 'gestor' || role === 'manager') {
                const { count } = await supabase.from('justificativas').select('id', { count: 'exact', head: true }).eq('status', 'pendente');
                sinoCount = count || 0;
            } else {
                const { count: cJustif } = await supabase.from('justificativas').select('id', { count: 'exact', head: true }).eq('funcionario_id', userId).eq('status', 'pendente');
                // Sincronizar com outros logs que vão para o sino (ex: geofence incidente se houver)
                const { count: cLogsSino } = await supabase.from('diario_logs')
                    .select('id', { count: 'exact', head: true })
                    .eq('funcionario_id', userId)
                    .eq('status_pendencia', 'pendente')
                    .neq('tipo', 'comunicado')
                    .neq('tipo', 'aviso_ferias');
                sinoCount = (cJustif || 0) + (cLogsSino || 0);
            }

            // 2. Comunicados e Feriados (Badge Diário)
            const { data: user } = await supabase.from('funcionarios').select('setor_id').eq('id', userId).single();
            const sectorId = user?.setor_id || '00000000-0000-0000-0000-000000000000';

            // Buscar comunicados oficiais
            const { data: coms } = await supabase.from('comunicados')
                .select('id, subtipo, lido')
                .or(`destinatario_id.eq.${userId},tipo.eq.geral,setor_id.eq.${sectorId}`);
            
            // Buscar logs informativos
            const { data: logs } = await supabase.from('diario_logs')
                .select('id')
                .eq('funcionario_id', userId)
                .in('tipo', ['comunicado', 'aviso_ferias'])
                .eq('status_pendencia', 'pendente');

            // Buscar feriados/folgas individuais ou do setor
            const { data: feriados } = await supabase.from('feriados_folgas')
                .select('id')
                .or(`funcionario_id.eq.${userId},setor_id.eq.${sectorId},escopo.eq.geral`);

            // Filtros de leitura no localStorage
            const cC = (coms || []).filter(c => !c.lido && !localStorage.getItem(`ciente_${c.id}`)).length;
            const cL = (logs || []).filter(l => !localStorage.getItem(`visto_${l.id}`)).length;
            const cF = (feriados || []).filter(f => !localStorage.getItem(`visto_feriado_${f.id}`)).length;
            
            const diarioCount = cC + cL + cF;

            // Injetar na UI (Suporta diversos IDs usados nas páginas)
            this.setBadge('notif-badge', sinoCount);
            this.setBadge('notif-badge-footer', diarioCount);
            this.setBadge('badge-sino', sinoCount);
            this.setBadge('badge-diario', diarioCount);

            // 3. Feedback Visual: Cor do Sino
            const sinoIcon = document.getElementById('sino-icon');
            if (sinoIcon) {
                if (sinoCount > 0) {
                    sinoIcon.classList.add('text-amber-500');
                    sinoIcon.classList.remove('text-slate-400');
                } else {
                    sinoIcon.classList.remove('text-amber-500');
                    sinoIcon.classList.add('text-slate-400');
                }
            }

        } catch (err) {
            console.error('[Notifications] Erro ao atualizar badges:', err);
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
