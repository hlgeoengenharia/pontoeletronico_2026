import { supabase } from '../supabase-config.js';
import { UI } from '../ui-utils.js';
import { DiarioAggregator } from '../core/diario.aggregator.js';
import { EventManager } from '../event-manager.js';
import { AwarenessManager } from '../core/awareness.manager.js';
import { HistoryRenderer } from '../core/history.renderer.js';
import { Notifications } from '../notifications.js';

/**
 * DiarioEngine - ChronoSync Engine
 * Controlador central para a tela de Diário de Bordo do Funcionário.
 * Isola a lógica de negócio do HTML.
 */
export const DiarioEngine = {
    state: {
        userId: null,
        employee: null,
        historyData: [],
        expanded: false
    },

    async init(userId) {
        this.state.userId = userId || localStorage.getItem('userId');
        UI.showLoader();
        
        try {
            // Inicializar Awareness para este usuário
            await AwarenessManager.init(this.state.userId);

            const { data: user } = await supabase
                .from('funcionarios')
                .select('*, setores!funcionarios_setor_id_fkey(id, nome, regra_ferias)')
                .eq('id', this.state.userId)
                .single();
            
            if (user) {
                this.state.employee = user;
                this.updateIdentityUI();
            }

            await this.loadAndProcessHistory();
            
            // Inicializar Notificações com o contexto do usuário
            if (window.Notifications) {
                Notifications.init(this.state.userId);
            }

        } catch (err) {
            console.error('[DiarioEngine] Erro na inicialização:', err);
        } finally {
            UI.hideLoader();
        }
    },

    updateIdentityUI() {
        const user = this.state.employee;
        if (!user) return;
        const elNickname = document.getElementById('user-nickname');
        const elEnrollment = document.getElementById('user-enrollment');
        
        if (elNickname) elNickname.innerText = user.nickname || user.nome_completo.split(' ')[0];
        if (elEnrollment) elEnrollment.innerText = `#${user.matricula || '---'}`;
    },

    async loadAndProcessHistory() {
        try {
            const sId = this.state.employee?.setor_id;
            const { rawData } = await DiarioAggregator.fetchAndAggregate(supabase, this.state.userId, sId);
            
            // Unificar dados via EventManager
            this.state.historyData = EventManager.unifyHistory(
                rawData.anotacoes, 
                rawData.justificativas, 
                rawData.comunicados, 
                rawData.logs, 
                rawData.ferias, 
                rawData.feriados,
                { isContextDiario: true, pontos: rawData.pontos }
            );

            // AUTO-CLEAR: Processar a lista unificada e TODAS as as fontes brutas para garantir 100% de cobertura
            const allSources = [
                ...this.state.historyData,
                ...rawData.anotacoes,
                ...rawData.justificativas,
                ...rawData.comunicados,
                ...rawData.feriados,
                ...rawData.logs
            ];
            await this.processAutoClear(allSources);

            this.render();
            
            // Atualizar badges após limpeza
            if (window.Notifications) Notifications.updateBadges();

        } catch (err) {
            console.error('[DiarioEngine] Erro ao carregar histórico:', err);
        }
    },

    async processAutoClear(allSources = []) {
        const toClear = allSources.filter(item => {
            const config = EventManager.getConfig(item);
            // Se não encontrar config direta, tenta inferir pelo itemType ou tipo
            const finalConfig = config || EventManager.getConfig({ type: item.tipo || item.itemType, ...item });
            return finalConfig && finalConfig.autoClear === true;
        });

        if (toClear.length > 0) {
            // 1. Limpeza Awareness (LocalStorage + config_notificacoes_lidas)
            await AwarenessManager.autoClear(toClear, this.state.userId);

            // 2. Limpeza de Diário (Garante atualização do campo status_pendencia no banco para sumir do Aggregator)
            // Chamamos via EventManager para aproveitar o processamento em lote especializado
            if (EventManager.clearAutoInformativos) {
                await EventManager.clearAutoInformativos(this.state.userId, toClear);
            }
        }
    },

    render() {
        const container = document.getElementById('historicoAnotacoesContainer');
        if (!container) return;

        // Filtrar eventos do dia atual (padrão) vs histórico completo (expandido)
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let itemsToShow;
        let hasOlderItems = false;

        if (this.state.expanded) {
            // Expandido: mostrar TODOS os eventos (ordem: mais recente no topo)
            itemsToShow = this.state.historyData;
        } else {
            // Padrão: mostrar apenas eventos do dia atual
            const todayItems = this.state.historyData.filter(item => {
                const itemDate = new Date(item.time || item.created_at || item.data_hora);
                return itemDate >= today;
            });
            // Se não houver nenhum evento hoje, mostrar os 5 mais recentes para não ficar vazio
            itemsToShow = todayItems.length > 0 ? todayItems : this.state.historyData.slice(0, 5);
            hasOlderItems = this.state.historyData.length > todayItems.length;
        }
        
        container.innerHTML = HistoryRenderer.renderList(itemsToShow, { 
            isAdmin: localStorage.getItem('userRole') === 'Admin', 
            isContextDiario: true,
            editingId: this.state.editingId
        });

        const elTotal = document.getElementById('labelTotalAnotacoes');
        if (elTotal) elTotal.innerText = `${this.state.historyData.length} registros`;

        // Botão de expandir: visível se há eventos de dias anteriores não exibidos
        const elExpandBtn = document.getElementById('containerBtnExpandir');
        if (elExpandBtn) {
            elExpandBtn.classList.toggle('hidden', !hasOlderItems || this.state.expanded);
        }
    },

    toggleExpand() {
        this.state.expanded = !this.state.expanded;
        this.render();
    },

    startEdit(id) {
        this.state.editingId = id;
        this.render();
    },

    cancelEdit() {
        this.state.editingId = null;
        this.render();
    },

    async saveEdit(id, type) {
        // Tentar encontrar o elemento de conteúdo (textarea) por diferentes IDs possíveis
        const textarea = document.getElementById(`edit-content-${id}`) || document.getElementById(`edit-desc-${id}`);
        if (!textarea) return;
        
        const newContent = textarea.value.trim();
        if (!newContent) return;

        UI.showLoader();
        try {
            let res;
            if (type === 'atividade') {
                const { AtividadesActions } = await import('../modules/atividades/atividades.actions.js');
                res = await AtividadesActions.save({ id, conteudo: newContent, funcionario_id: this.state.userId });
            } else if (type === 'justificativa') {
                const { JustificativasWorkflow } = await import('../modules/justificativas/justificativas.workflow.js');
                const typeSelect = document.getElementById(`edit-type-${id}`);
                const payload = { 
                    id, 
                    descricao: newContent, 
                    funcionario_id: this.state.userId 
                };
                if (typeSelect) payload.tipo_incidente = typeSelect.value;
                
                res = await JustificativasWorkflow.submit(payload);
            }
            
            if (res?.success) {
                this.state.editingId = null;
                await this.loadAndProcessHistory();
            }
        } catch (err) {
            console.error('[DiarioEngine] Erro ao salvar edição:', err);
        } finally {
            UI.hideLoader();
        }
    },

    async handleCiente(id, type) {
        await AwarenessManager.markAsSeen(id, type, this.state.userId);
        UI.showToast('Confirmado!', 'success');
        await this.loadAndProcessHistory();
    }
};

window.DiarioEngine = DiarioEngine;
