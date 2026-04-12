import { supabase } from '../../supabase-config.js';

/**
 * AlertarFeriadosScheduler - ChronoSync
 * Gerencia a criação automática do alerta mensal para Admin/Gestores.
 */
export const AlertarFeriadosScheduler = {
    async checkAndTrigger(user) {
        if (!user) return;
        const role = (user.nivel_acesso || user.role || '').toLowerCase();
        const isAdminOrGestor = ['admin', 'gestor', 'manager', 'comandante'].includes(role);

        if (!isAdminOrGestor) {
            console.log(`[AlertarFeriados] Acesso negado para papel: ${role}`);
            return;
        }

        const now = new Date();
        const day = now.getDate();
        const month = (now.getMonth() + 1).toString().padStart(2, '0');
        const year = now.getFullYear();
        const periodKey = `[PERIOD:${month}-${year}]`;
        const urlParams = new URLSearchParams(window.location.search);
        const forceTrigger = urlParams.get('force_alert') === 'true';

        // 1. Só executa no dia 1 de cada mês (ou via force_alert para teste)
        if (day !== 1 && !forceTrigger) {
            console.log(`[AlertarFeriados] Hoje é dia ${day}. Pulando verificação mensal.`);
            return;
        }

        try {
            // 2. Verificar se já existe o alerta para este mês (Global ou Setorial conforme o papel)
            const query = supabase
                .from('diario_logs')
                .select('id')
                .eq('tipo', 'alerta_feriados_folgas')
                .like('mensagem_padrao', `%${periodKey}%`);

            const { data, error } = await query;
            if (error) throw error;

            if (data && data.length > 0) {
                console.log(`[AlertarFeriados] Alerta para ${periodKey} já existe.`);
                return;
            }

            // 3. Criar Alerta Mensal
            // O alerta é criado vinculado ao funcionario_id do criador, 
            // mas devido ao tipo 'alerta_feriados_folgas' será exibido para todos os gestores.
            const { error: insError } = await supabase.from('diario_logs').insert([{
                funcionario_id: user.id || user.userId,
                data_hora: new Date().toISOString(),
                tipo: 'alerta_feriados_folgas',
                status_pendencia: 'pendente',
                mensagem_padrao: `ATENÇÃO: Atualizar e aprovar os feriados e folgas do mês. ${periodKey}`
            }]);

            if (insError) throw insError;
            console.log(`[AlertarFeriados] Novo alerta criado para ${periodKey}.`);

        } catch (err) {
            console.error('[AlertarFeriados] Erro no scheduler:', err);
        }
    }
};
