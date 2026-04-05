import { EventRegistry } from './event.registry.js';
import { AwarenessManager } from './awareness.manager.js';

/**
 * DiarioAggregator - ChronoSync Core
 * Soma as contagens de todos os tipos de eventos registrados para o Diário do funcionário.
 */
export const DiarioAggregator = {
    /**
     * Busca todos os dados necessários e calcula o total de notificações.
     */
    async fetchAndAggregate(supabase, userId, sectorId) {
        const sId = sectorId || '00000000-0000-0000-0000-000000000000';
        
        // Inicializar serviço de Awareness antes de agregar
        await AwarenessManager.init(userId);

        // Query Multidirecional Otimizada (Réplica do sucesso do Diário)
        const [resA, resJ, resComI, resComS, resComG, resFerI, resFerS, resFerG, resLogs, resFerTab] = await Promise.all([
            supabase.from('anotacoes').select('*').eq('funcionario_id', userId),
            supabase.from('justificativas').select('*').eq('funcionario_id', userId),
            supabase.from('comunicados').select('*').eq('destinatario_id', userId),
            supabase.from('comunicados').select('*').eq('setor_id', sId).eq('tipo', 'setorial'),
            supabase.from('comunicados').select('*').eq('tipo', 'geral'),
            supabase.from('feriados_folgas').select('*').eq('funcionario_id', userId),
            supabase.from('feriados_folgas').select('*').eq('setor_id', sId).eq('escopo', 'setorial'),
            supabase.from('feriados_folgas').select('*').eq('escopo', 'geral'),
            supabase.from('diario_logs').select('*').eq('funcionario_id', userId).in('tipo', ['comunicado', 'justificativa_resultado', 'justificativa', 'aviso_ferias']),
            supabase.from('ferias').select('*').eq('funcionario_id', userId)
        ]);

        const rawData = {
            anotacoes: resA.data || [],
            justificativas: resJ.data || [],
            comunicados: [...(resComI.data || []), ...(resComS.data || []), ...(resComG.data || [])],
            feriados: [...(resFerI.data || []), ...(resFerS.data || []), ...(resFerG.data || [])],
            logs: resLogs.data || [],
            ferias: resFerTab.data || []
        };

        return {
            total: this.aggregate(rawData, userId),
            rawData: rawData
        };
    },

    /**
     * Calcula o total de notificações (novidades) pendentes no Diário
     */
    aggregate(data, userId) {
        let total = 0;
        const allTypes = EventRegistry.getAllTypes();

        allTypes.forEach(type => {
            const provider = EventRegistry.getProvider(type);
            if (!provider || !provider.counter) return;

            let items = [];
            let typeSum = 0;

            if (type === 'mensagem' || type === 'hora_extra') {
                items = (data.comunicados || []).filter(c => {
                    const t = String(c.subtipo || c.tipo || '').toLowerCase();
                    return (type === 'hora_extra') ? (t === 'hora_extra') : (t !== 'hora_extra');
                });
            } else if (type === 'ferias') {
                // Notificações de Diário devem vir dos LOGS, não da tabela de cronograma bruta
                items = []; 
            } else if (type === 'cronograma_ferias') {
                // Notificações de Análise Administrativa (Aviso de Férias)
                items = (data.logs || []).filter(l => l.tipo === 'aviso_ferias');
            }

            typeSum += provider.counter.count(items, userId);
            total += typeSum;
        });

        return total;
    }
};
