import { supabase } from './supabase-config.js';
import { ScalesEngine } from './scales-engine.js';

export const PointLogic = {
    /**
     * Verifica se o funcionário esqueceu de bater o checkout no dia anterior
     * e aplica a regra de 50% da jornada.
     */
    async checkForgetfulness(funcionarioId) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const dateStr = yesterday.toISOString().split('T')[0];

        try {
            const { data: points, error } = await supabase
                .from('pontos')
                .select('*')
                .eq('funcionario_id', funcionarioId)
                .gte('data_hora', `${dateStr}T00:00:00`)
                .lte('data_hora', `${dateStr}T23:59:59`)
                .order('data_hora', { ascending: true });

            if (error) throw error;

            // Se houver apenas 1 ponto (Check-in), falta o Check-out
            if (pts && pts.length === 1 && pts[0].tipo === 'check-in') {
                await this.applyForgetfulnessRule(funcionarioId, pts[0], dateStr);
            }
        } catch (err) {
            console.error('Erro ao checar esquecimento:', err);
        }
    },

    /**
     * Aplica a regra de 50% da jornada quando o checkout é esquecido
     */
    async applyForgetfulnessRule(funcionarioId, checkIn, dateStr) {
        const { data: func } = await supabase
            .from('funcionarios')
            .select('*, escalas(*)')
            .eq('id', funcionarioId)
            .single();

        if (!func || !func.escalas) return;

        const weeklyHours = func.escalas.carga_horaria_semanal || 44;
        const dailyPlannedMinutes = (weeklyHours / 5) * 60; // Simplificado
        const penaltyMinutes = dailyPlannedMinutes * 0.5;

        const fakeCheckOut = new Date(checkIn.data_hora);
        fakeCheckOut.setMinutes(fakeCheckOut.getMinutes() + penaltyMinutes);

        await supabase.from('pontos').insert([{
            funcionario_id: funcionarioId,
            tipo: 'check-out',
            data_hora: fakeCheckOut.toISOString(),
            status: 'automatico_50',
            modalidade: checkIn.modalidade,
            saldo_horas_dia: `PT${Math.floor(penaltyMinutes / 60)}H${penaltyMinutes % 60}M`
        }]);

        console.log('Regra de 50% aplicada para:', funcionarioId);
    },

    /**
     * Calcula o saldo de horas de um dia específico
     */
    calculateDailyBalance(points, plannedHours) {
        if (!points || points.length < 2) return 0;

        let totalMinutes = 0;
        for (let i = 0; i < points.length; i += 2) {
            if (points[i + 1]) {
                const start = new Date(points[i].data_hora);
                const end = new Date(points[i + 1].data_hora);
                totalMinutes += (end - start) / (1000 * 60);
            }
        }

        // Subtrai 1h de almoço se jornada > 6h (Regra genérica)
        if (totalMinutes > 360) totalMinutes -= 60;

        const plannedMinutes = plannedHours * 60;
        return totalMinutes - plannedMinutes;
    }
};
