import { supabase } from './supabase-config.js';
import { ScalesEngine } from './scales-engine.js';
import { BiometricHelper } from './biometric-helper.js';

/**
 * BusinessRulesManager - Modulo de conformidade ChronoSync.
 * Gerencia penalidades, redirecionamentos e validacoes de biometria.
 */
export const BusinessRulesManager = {

    /**
     * Verifica se o usuario tem biometria cadastrada e em formato valido.
     */
    async checkBiometryPreflight(user) {
        if (!user || user.nivel_acesso === 'Admin') return true;

        const { data, error } = await supabase
            .from('funcionarios')
            .select('biometria_cadastrada, biometria_token')
            .eq('id', user.id)
            .single();

        const parsedTemplate = BiometricHelper.parseTemplate(data?.biometria_token || '');
        if (error || !data || !data.biometria_cadastrada || !parsedTemplate.valid) {
            console.warn('[Compliance] Biometria nao detectada. Redirecionando...');
            return false;
        }

        return true;
    },

    /**
     * Aplica penalidades apos rejeicao do Admin/Gestor.
     */
    async processRejection(item, type, adminObs) {
        console.log(`[BusinessRules] Processando rejeicao (${type}):`, item?.id);

        if (!item || !item.id) {
            console.warn('[BusinessRules] Item inválido, ignorando penalidade');
            return { success: false, skipped: true };
        }

        try {
            const punchType = item.tipo || 'check-in';
            const funcionarioId = item.funcionario_id;

            if (punchType === 'check-in') {
                await this.createAbsenceLog(funcionarioId, item.data_hora, adminObs);
            } else {
                await this.applyHalfJourneyPenalty(item, adminObs);
            }

            return { success: true };
        } catch (err) {
            console.error('[BusinessRules] Erro ao aplicar penalidade:', err);
            throw err;
        }
    },

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

    async applyHalfJourneyPenalty(item, adminObs) {
        const { data: user } = await supabase
            .from('funcionarios')
            .select('*, escalas(*)')
            .eq('id', item.funcionario_id)
            .single();

        if (!user || !user.escalas) {
            console.warn('[BusinessRules] Impossivel calcular penalidade: escala nao encontrada.');
            return;
        }

        const escala = user.escalas;
        const [hE, mE] = escala.horario_entrada.split(':').map(Number);
        const workMinutes = ScalesEngine.calculateDailyWorkMinutes(escala);
        const halfMinutes = Math.floor(workMinutes / 2);

        const departureTime = new Date(item.data_hora);
        departureTime.setHours(hE, mE, 0, 0);
        departureTime.setMinutes(departureTime.getMinutes() + halfMinutes);

        await supabase.from('pontos').update({
            data_hora: departureTime.toISOString(),
            status_validacao: 'rejeitado',
            justificativa_usuario: `[PENALIDADE: MEIO-TURNO APLICADO] ${item.justificativa_usuario || ''}`,
            observacao_admin: adminObs
        }).eq('id', item.id);

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
