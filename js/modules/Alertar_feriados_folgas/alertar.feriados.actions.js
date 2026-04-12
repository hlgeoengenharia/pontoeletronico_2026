import { supabase } from '../../supabase-config.js';
import { UI } from '../../ui-utils.js';

/**
 * AlertarFeriadosActions - ChronoSync
 * Executa as ações vinculadas ao Card de Alerta Mensal.
 */
export const AlertarFeriadosActions = {
    async resolverAlerta(id) {
        UI.showLoader();
        try {
            // 1. Marcar como 'visto' no banco de dados para o setor
            // Como este alerta é global/setorial por tipo, marcamos este registro específico.
            const { error } = await supabase
                .from('diario_logs')
                .update({ status_pendencia: 'visto' })
                .eq('id', id);

            if (error) throw error;

            UI.showToast('Alerta resolvido!', 'success');
            
            // 2. Recarregar lista pendências se estiver na tela de autorizações
            if (typeof window.loadJustificativas === 'function') {
                window.loadJustificativas();
            }

            // 3. Atualizar Badges do Sino
            if (window.Notifications && window.Notifications.updateBadges) {
                window.Notifications.updateBadges();
            }

        } catch (err) {
            console.error('[AlertarFeriados] Erro ao resolver alerta:', err);
            UI.showToast('Erro ao confirmar alerta', 'error');
        } finally {
            UI.hideLoader();
        }
    },

    irParaFeriados() {
        // Redireciona para o console administrativo com gatilho para abrir o modal de feriados
        window.location.href = 'online.html?mode=ferias&trigger=ferias';
    }
};

window.AlertarFeriadosActions = AlertarFeriadosActions;
