/**
 * Notifications Engine - ChronoSync
 * Gerencia alertas de escalas e pendências.
 */

import { supabase } from './supabase-config.js';

const NotificationsEngine = {
    /**
     * Verifica alertas de escala para um funcionário
     * @param {Object} func Dados do funcionário
     */
    async checkScaleAlerts(func) {
        if (!func) return null;

        const alerts = [];
        const now = new Date();
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        const diffToEnd = monthEnd.getTime() - now.getTime();
        const hoursToEnd = diffToEnd / (1000 * 60 * 60);

        // 1. Alerta 48h para Fim do Mês
        if (hoursToEnd <= 48 && hoursToEnd > 0) {
            // Verificar se o próximo mês já tem plantões (instância manual ou regra template)
            // Para simplificar, verificamos se o usuário já visitou o calendário do mês seguinte
            // Mas a regra diz: "Confirmar mensal manual".
            const nextMonth = now.getMonth() + 1;
            const year = nextMonth > 11 ? now.getFullYear() + 1 : now.getFullYear();
            const monthStr = String((nextMonth % 12) + 1).padStart(2, '0');

            const { count } = await supabase
                .from('plantoes_confirmados')
                .select('*', { count: 'exact', head: true })
                .eq('funcionario_id', func.id)
                .gte('data', `${year}-${monthStr}-01`);

            if (count === 0) {
                alerts.push({
                    type: 'warning',
                    title: 'ESCALA PENDENTE',
                    message: `Faltam menos de 48h para o fim do mês. Planeje sua escala de ${monthStr}/${year}!`,
                    icon: 'event_busy'
                });
            }
        }

        // 2. Alerta por Frequência
        if (func.ultima_confirmacao_escala) {
            const lastConfirm = new Date(func.ultima_confirmacao_escala);
            const freqDays = func.frequencia_confirmacao_dias || 30;
            const diffDays = (now.getTime() - lastConfirm.getTime()) / (1000 * 60 * 60 * 24);

            if (diffDays >= freqDays) {
                alerts.push({
                    type: 'info',
                    title: 'ATUALIZAÇÃO NECESSÁRIA',
                    message: `Sua escala não é confirmada há ${Math.floor(diffDays)} dias. Revise seu cronograma.`,
                    icon: 'update'
                });
            }
        }

        return alerts;
    },

    /**
     * Renderiza um banner de alerta no topo do elemento pai
     */
    renderAlerts(container, alerts) {
        if (!container || !alerts || alerts.length === 0) return;

        alerts.forEach(alert => {
            const alertDiv = document.createElement('div');
            alertDiv.className = `mx-4 mt-4 p-4 rounded-2xl flex items-center gap-4 border shadow-lg animate-pulse ${alert.type === 'warning' ? 'bg-amber-500/10 border-amber-500/50 text-amber-500' : 'bg-primary/10 border-primary/50 text-primary'
                }`;

            alertDiv.innerHTML = `
                <span class="material-symbols-outlined text-2xl">${alert.icon}</span>
                <div class="flex-1">
                    <p class="text-[10px] font-black uppercase tracking-widest">${alert.title}</p>
                    <p class="text-[11px] font-medium opacity-80">${alert.message}</p>
                </div>
                <button class="p-1 hover:bg-white/5 rounded" onclick="this.parentElement.remove()">
                    <span class="material-symbols-outlined text-sm">close</span>
                </button>
            `;
            container.prepend(alertDiv);
        });
    }
};

export { NotificationsEngine };
