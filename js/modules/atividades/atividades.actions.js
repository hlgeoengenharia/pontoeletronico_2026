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
            const payload = {
                funcionario_id: data.funcionario_id,
                conteudo: data.conteudo,
                data: data.data || new Date().toISOString(),
                created_at: data.created_at || new Date().toISOString()
            };

            let res;
            if (data.id) {
                // Atualizar
                res = await supabase.from('anotacoes').update(payload).eq('id', data.id);
            } else {
                // Inserir
                res = await supabase.from('anotacoes').insert([payload]);
            }

            if (res.error) throw res.error;

            UI.showToast('Atividade registrada com sucesso!', 'success');
            return { success: true };
        } catch (err) {
            console.error('[Atividades] Erro ao salvar:', err);
            UI.showToast('Erro ao salvar atividade.', 'error');
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
