import { supabase } from './supabase-config.js';
import { ScalesEngine } from './scales-engine.js';

/**
 * BusinessRulesManager - Módulo de Conformidade ChronoSync
 * Gerencia penalidades, redirecionamentos e validações de biometria.
 */
export const BusinessRulesManager = {

    /**
     * Verifica se o usuário tem biometria cadastrada.
     * Caso contrário, redireciona ao perfil com parâmetro para auto-enroll.
     */
    async checkBiometryPreflight(user) {
        if (!user || user.nivel_acesso === 'Admin') return true; // Admins isentos de bloqueio p/ manutenção

        const { data, error } = await supabase
            .from('funcionarios')
            .select('biometria_cadastrada')
            .eq('id', user.id)
            .single();

        if (error || !data || !data.biometria_cadastrada) {
            console.warn('[Compliance] Biometria não detectada. Redirecionando...');
            return false;
        }
        return true;
    },

    /**
     * Aplica penalidades após rejeição do Admin/Gestor
     * @param {Object} item Dados do ponto ou log
     * @param {string} type 'SISTEMA' ou 'PONTO'
     * @param {string} adminObs Justificativa do Admin
     */
    async processRejection(item, type, adminObs) {
        console.log(`[BusinessRules] Processando Rejeição (${type}):`, item.id);
        
        try {
            // 1. Identificar se é Check-in ou Check-out
            const punchType = item.tipo || 'check-in';
            const funcionarioId = item.funcionario_id;

            if (punchType === 'check-in') {
                // REGRA: Rejeição de Check-in = FALTA
                await this.createAbsenceLog(funcionarioId, item.data_hora, adminObs);
            } else {
                // REGRA: Rejeição de Check-out = PUNIR ESQUECIMENTO (Meio Turno)
                await this.applyHalfJourneyPenalty(item, adminObs);
            }

            return { success: true };
        } catch (err) {
            console.error('[BusinessRules] Erro ao aplicar penalidade:', err);
            throw err;
        }
    },

    /**
     * Registra uma falta injustificada no sistema após rejeição de entrada
     */
    async createAbsenceLog(funcionarioId, dataHora, adminObs) {
        const dateStr = new Date(dataHora).toLocaleDateString('pt-BR');
        await supabase.from('diario_logs').insert([{
            funcionario_id: funcionarioId,
            data_hora: new Date().toISOString(),
            tipo: 'falta',
            status_pendencia: 'visto',
            mensagem_padrao: `[PENALIDADE: FALTA INJUSTIFICADA] Sua entrada em ${dateStr} foi rejeitada pelo gestor. Motivo: ${adminObs}`
        }]);
    },

    /**
     * Calcula e insere saída fictícia (50% da jornada)
     */
    async applyHalfJourneyPenalty(item, adminObs) {
        const { data: user } = await supabase
            .from('funcionarios')
            .select('*, escalas(*)')
            .eq('id', item.funcionario_id)
            .single();

        if (!user || !user.escalas) {
             console.warn('[BusinessRules] Impossível calcular penalidade: Escala não encontrada.');
             return;
        }

        const escala = user.escalas;
        const [hE, mE] = escala.horario_entrada.split(':').map(Number);
        
        // Calcular 50% da jornada total
        // Se a jornada for 08:00 às 17:00 (9h brutos), metade são 4.5h após a entrada.
        const workMinutes = ScalesEngine.calculateDailyWorkMinutes(escala);
        const halfMinutes = Math.floor(workMinutes / 2);

        const departureTime = new Date(item.data_hora); // Baseado na data original do ponto
        departureTime.setHours(hE, mE, 0, 0);
        departureTime.setMinutes(departureTime.getMinutes() + halfMinutes);

        // Atualizar o registro de ponto original com o horário de saída "PUNIDO"
        await supabase.from('pontos').update({
            data_hora: departureTime.toISOString(),
            status_validacao: 'rejeitado',
            justificativa_usuario: `[PENALIDADE: MEIO-TURNO APLICADO] ${item.justificativa_usuario || ''}`,
            observacao_admin: adminObs
        }).eq('id', item.id);

        // Notificar no diário
        await supabase.from('diario_logs').insert([{
            funcionario_id: item.funcionario_id,
            data_hora: new Date().toISOString(),
            tipo: 'sistema',
            status_pendencia: 'pendente',
            mensagem_padrao: `[PENALIDADE] Seu check-out foi rejeitado e contabilizado apenas como meio-turno. Motivo: ${adminObs}`
        }]);
    }
};

window.BusinessRulesManager = BusinessRulesManager;
