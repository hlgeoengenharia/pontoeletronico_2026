import { supabase } from '../../supabase-config.js';
import { UI } from '../../ui-utils.js';

/**
 * Atividades Actions Module - ChronoSync Core
 * Gerencia as operações de CRUD (Salvar, Editar, Excluir) de atividades.
 */
export const AtividadesActions = {
    /**
     * Salva ou atualiza uma atividade no banco de dados.
     */
    async save(data) {
        UI.showLoader();
        try {
            // Importação dinâmica para evitar dependência circular se necessário
            const { Auth } = await import('../../auth.js');
            const currentUser = Auth.getUser();

            const payload = {
                funcionario_id: data.funcionario_id,
                company_id: data.company_id || currentUser.companyId,
                conteudo: data.conteudo || data.descricao || '---',
                data: data.data || data.data_incidente || new Date().toISOString()
            };

            console.log('[Atividades] Tentando salvar:', payload);

            let res;
            if (data.id) {
                res = await supabase.from('anotacoes').update({
                    conteudo: payload.conteudo,
                    data: payload.data
                }).eq('id', data.id);
            } else {
                res = await supabase.from('anotacoes').insert([payload]);
            }

            if (res.error) {
                console.group('[Atividades] Erro do Supabase');
                console.error('Mensagem:', res.error.message);
                console.error('Código:', res.error.code);
                console.error('Detalhes:', res.error.details);
                console.error('Hint:', res.error.hint);
                console.groupEnd();
                throw res.error;
            }

            UI.showToast('Atividade registrada com sucesso!', 'success');
            return { success: true };
        } catch (err) {
            console.error('[Atividades] Erro capturado no catch:', err);
            UI.showToast(`Erro ao salvar: ${err?.message || 'Falha técnica'}`, 'error');
            return { success: false, error: err };
        } finally {
            UI.hideLoader();
        }
    },

    /**
     * Exclui uma atividade do banco de dados.
     */
    async delete(id) {
        if (!confirm('Deseja realmente excluir este registro?')) return false;

        UI.showLoader();
        try {
            const { error } = await supabase.from('anotacoes').delete().eq('id', id);
            if (error) throw error;

            UI.showToast('Atividade excluída.', 'success');
            return true;
        } catch (err) {
            console.error('[Atividades] Erro ao excluir:', err);
            UI.showToast('Erro ao excluir registro.', 'error');
            return false;
        } finally {
            UI.hideLoader();
        }
    }
};
