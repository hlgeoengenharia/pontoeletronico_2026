import { supabase } from '../../supabase-config.js';
import { UI } from '../../ui-utils.js';
import { Auth } from '../../auth.js';

/**
 * Justificativas Workflow Module - ChronoSync Core
 * Gerencia o ciclo de vida de uma justificativa (Envio, Anexo, Status).
 */
export const JustificativasWorkflow = {
    /**
     * Envia ou atualiza uma justificativa no banco de dados.
     */
    async submit(data) {
        UI.showLoader();
        try {
            const currentUser = Auth.getUser();
            const payload = {
                funcionario_id: data.funcionario_id,
                company_id: data.company_id || currentUser.companyId, // Obrigatório para RLS
                data_incidente: data.data_incidente || new Date().toISOString(),
                tipo_divergencia: data.tipo_incidente || data.tipo_divergencia || 'OUTROS',
                descricao: data.justificativa || data.descricao || '---',
                status: data.status || 'pendente'
            };

            // Preservar evidência se for edição (não sobrescrever com null se não enviado)
            const newUrl = data.url_anexo || data.evidencia_url;
            if (newUrl) {
                payload.evidencia_url = newUrl;
            } else if (!data.id) {
                payload.evidencia_url = null;
            }

            let res;
            if (data.id) {
                // Atualizar registro existente
                res = await supabase.from('justificativas').update(payload).eq('id', data.id);
            } else {
                // Inserir novo registro
                res = await supabase.from('justificativas').insert([payload]);
            }

            if (res.error) throw res.error;
            
            UI.showToast(data.id ? 'Justificativa atualizada.' : 'Justificativa enviada!', 'success');
            return { success: true };
        } catch (err) {
            console.error('[Justificativas] Erro ao submeter:', err);
            UI.showToast('Erro ao processar justificativa.', 'error');
            return { success: false, error: err };
        } finally {
            UI.hideLoader();
        }
    },

    /**
     * Faz o upload de um anexo (evidência) para o storage do Supabase.
     */
    async uploadEvidence(file, funcionarioId) {
        if (!file) return null;
        
        const fileExt = file.name.split('.').pop();
        const fileName = `${funcionarioId}_${Date.now()}.${fileExt}`;
        const filePath = `justificativas/${fileName}`;

        try {
            const { error: uploadError } = await supabase.storage
                .from('evidencias')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data } = supabase.storage.from('evidencias').getPublicUrl(filePath);
            return data.publicUrl;
        } catch (err) {
            console.error('[Justificativas] Erro no upload:', err);
            return null;
        }
    }
};
