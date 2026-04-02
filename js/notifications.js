import { supabase } from './supabase-config.js';
import { EventManager } from './event-manager.js';
import { ScalesEngine } from './scales-engine.js';

/**
 * Módulo Notifications - Projeto V01
 * Gerencia a contagem de badges (Sino e Diário) de forma global.
 */
export const Notifications = {
    async updateBadges() {
        const userId = localStorage.getItem('userId');
        const userRole = localStorage.getItem('userRole');
        const role = (userRole || '').toLowerCase();
        const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        const safeUserId = uuidPattern.test(userId) ? userId : (role === 'admin' ? userId : '00000000-0000-0000-0000-000000000000');

        try {
            // A. Justificativas e Pendências (Badge Sino)
            let sinoCount = 0;
            const role = (userRole || '').toLowerCase();
            let justCount = 0;
            let feriasCount = 0;
            const isManagement = role === 'admin' || role === 'gestor' || role === 'manager';
            
            try {
                const isManagement = role === 'admin' || role === 'gestor' || role === 'manager';
                const isGestorOnly = (role === 'gestor' || role === 'manager');
                
                if (isManagement) {
                    let queryJust = supabase.from('justificativas').select('id, funcionarios!funcionario_id!inner(setor_id)', { count: 'exact', head: true }).eq('status', 'pendente');
                    let queryFerias = supabase.from('ferias').select('funcionario_id, funcionarios!funcionario_id!inner(setor_id)').eq('status', 'pendente');
                    
                    if (isGestorOnly) {
                        const { data: userDat } = await supabase.from('funcionarios').select('setor_id').eq('id', safeUserId).maybeSingle();
                        if (userDat?.setor_id) {
                            queryJust = queryJust.eq('funcionarios.setor_id', userDat.setor_id);
                            queryFerias = queryFerias.eq('funcionarios.setor_id', userDat.setor_id);
                        }
                    }
                    
                    const [resJust, resFerias] = await Promise.all([queryJust, queryFerias]);
                    justCount = resJust.count || 0;
                    
                    // Agrupa por funcionário para não contar as parcelas repetidas
                    if (resFerias.data) {
                        feriasCount = new Set(resFerias.data.map(f => f.funcionario_id)).size;
                    } else {
                        feriasCount = 0;
                    }
                    
                    sinoCount = justCount; // Férias não somam no sino, têm botão próprio
                } else {
                    const [resJust, resLogs] = await Promise.all([
                        supabase.from('justificativas').select('id', { count: 'exact', head: true }).eq('funcionario_id', safeUserId).eq('status', 'pendente'),
                        supabase.from('diario_logs').select('id', { count: 'exact', head: true }).eq('funcionario_id', safeUserId).eq('status_pendencia', 'pendente')
                            .not('tipo', 'in', '("comunicado","aviso_ferias")')
                    ]);
                    sinoCount = (resJust.count || 0) + (resLogs.count || 0);
                }
            } catch (e) { console.warn('[Notifications] Erro ao carregar contagem do Sino:', e); }

            // B. Comunicados e Feriados (Badge Diário)
            let diarioCount = 0;
            try {
                const { data: user } = await supabase.from('funcionarios').select('setor_id, escala_id').eq('id', safeUserId).maybeSingle();
                const sectorId = user?.setor_id || '00000000-0000-0000-0000-000000000000';
                
                

                const [resComs, resLogs, resFer, resJustProcessed] = await Promise.all([
                    supabase.from('comunicados').select('id, subtipo, lido, created_at').or(`destinatario_id.eq.${safeUserId},tipo.eq.geral,setor_id.eq.${sectorId}`),
                    supabase.from('diario_logs').select('id, tipo').eq('funcionario_id', safeUserId).in('tipo', ['comunicado', 'aviso_ferias']).eq('status_pendencia', 'pendente'),
                    supabase.from('feriados_folgas').select('id, created_at').or(`funcionario_id.eq.${safeUserId},setor_id.eq.${sectorId},escopo.eq.geral`),
                    supabase.from('justificativas').select('id, status').eq('funcionario_id', safeUserId).neq('status', 'pendente')
                ]);

                // Buscar Escala para regra de fim de turno
                let isShiftFinished = false;
                if (user?.escala_id) {
                    const { data: escalaData } = await supabase.from('escalas').select('*').eq('id', user.escala_id).maybeSingle();
                    const now = new Date();
                    const todayStr = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
                    isShiftFinished = ScalesEngine.isDayFinished(todayStr, escalaData);
                }

                const itemsCC = (resComs.data || []).filter(c => {
                    const config = EventManager.getConfig({ itemType: 'COMUNICADO', ...c });
                    const isManualSeen = c.lido === true || localStorage.getItem(`ciente_${c.id}`);
                    
                    // Comunicados (Simples ou Hora Extra) somem se "Vistos" ou no "Fim do Turno"
                    return !isManualSeen && !isShiftFinished;
                });
                const cC = itemsCC.length;

                const itemsCL = (resLogs.data || []).filter(l => {
                    const isSeen = localStorage.getItem(`visto_${l.id}`);
                    const config = EventManager.getConfig({ itemType: 'SISTEMA', ...l });
                    return !isSeen || !config.autoClear;
                });
                const cL = itemsCL.length;

                const itemsCF = (resFer.data || []).filter(f => {
                    const isManualSeen = localStorage.getItem(`visto_feriado_${f.id}`);
                    // Feriados/Folgas somem se "Vistos" ou no "Fim do Turno"
                    return !isManualSeen && !isShiftFinished;
                });
                const cF = itemsCF.length > 0 ? 1 : 0;

                const itemsCJ = (resJustProcessed.data || []).filter(j => {
                    const isSeen = localStorage.getItem(`visto_justificativa_${j.id}`);
                    return !isSeen;
                });
                const cJ = itemsCJ.length;

                diarioCount = cC + cL + cF + cJ;
            } catch (e) { console.warn('[Notifications] Erro ao carregar contagem do Diário:', e); }

            // Log Aprimorado para clareza
            if (isManagement) {
                console.log(`Contagem de Badges -> Diário: ${diarioCount}, Justificativas (Sino): ${justCount}, Férias (Dashboard): ${feriasCount}`);
            } else {
                console.log(`Contagem de Badges -> Diário: ${diarioCount}, Pendências (Sino): ${sinoCount}`);
            }

            // C. Atualização da UI
            this.setBadge('notif-badge', sinoCount);
            this.setBadge('notif-badge-footer', diarioCount);
            this.setBadge('badge-sino', sinoCount);
            this.setBadge('badge-diario', diarioCount);
            
            // Atualiza o stat/badge específico do botão de Férias Pendentes no dashboard
            this.setBadge('stat-ferias-mes', feriasCount);

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

        // Listen for badge refresh triggers from other pages (e.g., after comunicado insert)
        window.addEventListener('storage', (e) => {
            if (e.key === 'badgeRefresh') {
                this.updateBadges();
            }
        });
        const channel = supabase.channel('realtime-notifications')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'comunicados' }, () => this.updateBadges())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'justificativas' }, () => this.updateBadges())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'diario_logs' }, () => this.updateBadges())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'ferias' }, () => this.updateBadges())
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
