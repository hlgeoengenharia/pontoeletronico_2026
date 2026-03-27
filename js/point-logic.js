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
            console.log(`[PointLogic] Analisando batidas de ${dateStr} para funcionário ${funcionarioId}...`);

            // Se houver apenas 1 ponto (Check-in), falta o Check-out
            if (points && points.length === 1 && points[0].tipo === 'check-in') {
                console.log(`[PointLogic] Esquecimento detectado em ${dateStr}.`);
                await this.applyForgetfulnessRule(funcionarioId, points[0], dateStr);
            }
        } catch (err) {
            console.error('[PointLogic] Falha ao checar esquecimento:', err);
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

        const escala = func.escalas;
        const weeklyHours = escala.carga_horaria_semanal || 44;
        const dailyPlannedMinutes = (weeklyHours / 5) * 60; 
        const penaltyMinutes = dailyPlannedMinutes * 0.5;

        const checkInDate = new Date(checkIn.data_hora);
        const fakeCheckOut = new Date(checkInDate.getTime() + penaltyMinutes * 60000);

        // 1. Inserir Ponto Automático com status Pendente
        const { error: pError } = await supabase.from('pontos').insert([{
            funcionario_id: funcionarioId,
            tipo: 'check-out',
            data_hora: fakeCheckOut.toISOString(),
            status: 'automatico_50',
            status_validacao: 'pendente',
            modalidade: checkIn.modalidade,
            justificativa_usuario: 'Registro automático por esquecimento de check-out (Regra 50% da jornada).',
            geolocalizacao_json: checkIn.geolocalizacao_json
        }]);

        if (pError) throw pError;

        // 2. Registrar no Diário de Bordo
        const msg = `O sistema detectou que você esqueceu de registrar sua saída no dia ${new Date(dateStr).toLocaleDateString('pt-BR')}. Um registro automático de 50% da sua jornada foi criado e aguarda análise do seu gestor para ser efetivado no histórico.`;
        
        await supabase.from('diario_logs').insert([{
            funcionario_id: funcionarioId,
            data_hora: new Date().toISOString(),
            tipo: 'esquecimento_ponto',
            mensagem_padrao: msg,
            status_pendencia: 'pendente'
        }]);

        console.log(`[PointLogic] Regra de 50% aplicada e pendente para: ${funcionarioId}`);
    },

    /**
     * Calcula o saldo de horas de um dia específico
     */
    calculateDailyBalance(points, plannedHours, possuiAlmoco = true) {
        if (!points || points.length < 2) return 0;

        let totalMinutes = 0;
        for (let i = 0; i < points.length; i += 2) {
            if (points[i + 1]) {
                const start = new Date(points[i].data_hora);
                const end = new Date(points[i + 1].data_hora);
                totalMinutes += (end - start) / (1000 * 60);
            }
        }

        // Subtrai 1h de almoço se jornada > 6h e estiver configurado
        if (possuiAlmoco && totalMinutes > 360) {
            totalMinutes -= 60;
        }

        const plannedMinutes = plannedHours * 60;
        return totalMinutes - plannedMinutes;
    }
};
