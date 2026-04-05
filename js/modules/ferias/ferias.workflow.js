import { supabase } from '../../supabase-config.js';
import { UI } from '../../ui-utils.js';

/**
 * Ferias Workflow Module - ChronoSync Core
 * Gerencia o ciclo de vida do planejamento de férias (Confirmação, Envio, Dashboard).
 */
export const FeriasWorkflow = {
    /**
     * Envia o cronograma completo de parcelas para aprovação.
     * @param {Array} parcelas 
     * @param {string} funcionarioId 
     */
    async submitCronograma(parcelas, funcionarioId) {
        UI.showLoader();
        try {
            // 1. Limpar parcelas pendentes anteriores (Limpeza de rascunho)
            await supabase.from('ferias')
                .delete()
                .eq('funcionario_id', funcionarioId)
                .eq('status', 'pendente');

            // 2. Inserir novas parcelas
            const { error } = await supabase.from('ferias').insert(
                parcelas.map(p => ({
                    funcionario_id: funcionarioId,
                    data_inicio: p.data_inicio,
                    data_fim: p.data_fim,
                    parcela_numero: p.parcela_numero,
                    status: 'pendente'
                }))
            );

            if (error) throw error;

            UI.showToast('Cronograma de férias enviado com sucesso!', 'success');
            return { success: true };
        } catch (err) {
            console.error('[Ferias] Erro ao enviar cronograma:', err);
            UI.showToast('Erro ao enviar planejamento.', 'error');
            return { success: false, error: err };
        } finally {
            UI.hideLoader();
        }
    }
};
