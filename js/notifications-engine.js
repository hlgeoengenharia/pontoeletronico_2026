/**
 * Notifications Engine - ChronoSync
 * Gerencia alertas de escalas e pendências.
 */

import { supabase } from './supabase-config.js';
import { ScalesEngine } from './scales-engine.js';

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

        // 1. Alerta 48h para Fim do Mês -> Gera Pendência para o Gestor/Admin
        if (hoursToEnd <= 48 && hoursToEnd > 0) {
            const nextMonth = now.getMonth() + 1;
            const year = nextMonth > 11 ? now.getFullYear() + 1 : now.getFullYear();
            const monthStr = String((nextMonth % 12) + 1).padStart(2, '0');

            const { count } = await supabase
                .from('plantoes_confirmados')
                .select('*', { count: 'exact', head: true })
                .eq('funcionario_id', func.id)
                .gte('data', `${year}-${monthStr}-01`);

            if (count === 0) {
                // Em vez de alertar o funcionário, geramos uma pendência para o gestor aprovar/fazer
                const { count: pendCount } = await supabase
                    .from('justificativas')
                    .select('*', { count: 'exact', head: true })
                    .eq('funcionario_id', func.id)
                    .eq('tipo_divergencia', 'Escala Pendente')
                    .eq('status', 'pendente')
                    .eq('data_incidente', `${year}-${monthStr}-01`);
                
                if (pendCount === 0) {
                    await supabase.from('justificativas').insert([{
                        funcionario_id: func.id,
                        data_incidente: `${year}-${monthStr}-01`,
                        tipo_divergencia: 'Escala Pendente',
                        descricao: `O mês ${monthStr}/${year} vai iniciar em menos de 48h e não há registro de programação de escala/plantões para este funcionário.`,
                        status: 'pendente'
                    }]);
                }
            }
        }

        // 2. Alerta por Frequência (Mantido para o funcionário ver como banner)
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
     * Verifica dias de trabalho encerrados nos últimos 15 dias que não possuem ponto registrado.
     * Gera uma justificativa "pendente" automaticamente se não existir.
     * @param {Object} func Dados do funcionário completo (incluindo escalas)
     */
    async checkMissingPunches(func) {
        if (!func || !func.escalas) return;

        const now = new Date();
        const startCheck = new Date();
        startCheck.setDate(now.getDate() - 15); // Look back 15 days
        
        // Start from startCheck or from escala.vigencia_inicio (whichever is later)
        const vigenciaInicio = new Date(func.escalas.vigencia_inicio + 'T00:00:00');
        let checkDate = startCheck > vigenciaInicio ? startCheck : vigenciaInicio;

        // Collect all target dates to check
        const targetDates = [];
        while (checkDate <= now) {
            const y = checkDate.getFullYear();
            const m = checkDate.getMonth();
            const d = checkDate.getDate();
            const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            
            // Generate planned days for this specific month if not generated
            // Check if dateStr is in planned days and is finished
            const plannedDays = ScalesEngine.projectBaseDays(func.escalas, func.escalas.vigencia_inicio, m, y);
            
            if (plannedDays.includes(dateStr) && ScalesEngine.isDayFinished(dateStr, func.escalas)) {
                targetDates.push(dateStr);
            }
            // Add 1 day
            checkDate.setDate(checkDate.getDate() + 1);
        }

        if (targetDates.length === 0) return;

        // Batch queries
        const minDate = targetDates[0];
        const maxDate = targetDates[targetDates.length - 1];

        const { data: pontos } = await supabase
            .from('pontos')
            .select('data_hora')
            .eq('funcionario_id', func.id)
            .gte('data_hora', `${minDate}T00:00:00`)
            .lte('data_hora', `${maxDate}T23:59:59`);

        const { data: justificativas } = await supabase
            .from('justificativas')
            .select('data_incidente')
            .eq('funcionario_id', func.id)
            .in('data_incidente', targetDates);

        // --- NOVO: Buscar Férias e Feriados para Isenção ---
        const sId = func.setor_id || '00000000-0000-0000-0000-000000000000';
        const [resFer, resVac] = await Promise.all([
            supabase.from('feriados_folgas').select('data').or(`funcionario_id.eq.${func.id},setor_id.eq.${sId},escopo.eq.geral`).in('data', targetDates),
            supabase.from('ferias').select('data_inicio, data_fim').eq('funcionario_id', func.id).eq('status', 'aprovado')
        ]);

        const feriadosDates = (resFer.data || []).map(f => f.data);
        const feriasData = resVac.data || [];

        const execOptions = [];

        for (const dateStr of targetDates) {
            const hasPonto = pontos && pontos.some(p => p.data_hora.startsWith(dateStr));
            const hasJustificativa = justificativas && justificativas.some(j => j.data_incidente === dateStr);
            
            // Verificar Isenção (Helper local ou lógico)
            const isFeriado = feriadosDates.includes(dateStr);
            const isFerias = feriasData.some(f => dateStr >= f.data_inicio && dateStr <= f.data_fim);

            if (!hasPonto && !hasJustificativa && !isFeriado && !isFerias) {
                // Auto-create pendency
                execOptions.push({
                    funcionario_id: func.id,
                    data_incidente: dateStr,
                    tipo_divergencia: 'Esquecimento de Registro',
                    descricao: 'Sistema identificou ausência de batida de ponto neste dia de escala informada. Por favor, regularize preenchendo o motivo real (ex: problema técnico, batida retroativa em papel, etc).',
                    status: 'pendente'
                });
            }
        }

        if (execOptions.length > 0) {
            await supabase.from('justificativas').insert(execOptions);
        }
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
