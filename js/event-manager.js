import { ScalesEngine } from './scales-engine.js';

/**
 * EventManager - ChronoSync
 * Única fonte de verdade para regras de negócio, títulos e ícones de eventos.
 */
const EventManager = {
    // 1. Configuração Visual de Eventos
    EVENT_CONFIG: {
        'ATIVIDADE': {
            title: 'ATIVIDADE DO DIA',
            icon: 'assignment',
            colorClass: 'text-primary',
            premiumBorder: 'premium-border-blue',
            autoClear: true
        },
        'JUSTIFICATIVA': {
            title: 'JUSTIFICATIVA DE PONTO',
            icon: 'history_edu',
            colorClass: 'text-amber-500',
            premiumBorder: 'premium-border-amber',
            autoClear: true // Limpeza automática ao carregar no Diário
        },
        'FERIAS': {
            title: 'FÉRIAS PROGRAMADAS',
            icon: 'beach_access',
            colorClass: 'text-sky-400',
            premiumBorder: 'premium-border-sky',
            autoClear: true
        },
        'COMUNICADO': {
            title: 'COMUNICADO DO DIA',
            icon: 'campaign',
            colorClass: 'text-primary',
            premiumBorder: 'premium-border-blue',
            autoClear: true
        },
        'HORA_EXTRA': {
            title: 'SOLICITAÇÃO DE HORA EXTRA',
            icon: 'timer',
            colorClass: 'text-amber-500',
            premiumBorder: 'premium-border-amber',
            autoClear: false // Requer CIENTE ou Fim de Turno
        },
        'SISTEMA': {
            title: 'LOG DO SISTEMA',
            icon: 'analytics',
            colorClass: 'text-rose-500',
            premiumBorder: 'premium-border-rose',
            autoClear: true
        },
        'GPS': {
            title: 'ALERTA DE LOCALIZAÇÃO',
            icon: 'pin_drop',
            colorClass: 'text-rose-400',
            premiumBorder: 'premium-border-rose',
            autoClear: true
        },
        'FERIAS_FOLGA': {
            title: 'FERIADOS E FOLGAS',
            icon: 'event_note',
            colorClass: 'text-purple-500',
            premiumBorder: 'premium-border-purple',
            autoClear: true
        },
        'EVENTO': {
            title: 'EVENTO AGENDADO',
            icon: 'calendar_today',
            colorClass: 'text-indigo-400',
            premiumBorder: 'premium-border-blue',
            autoClear: true
        },
        'JUSTIFICATIVA_RESULTADO': {
            title: 'RESULTADO DE ANÁLISE',
            icon: 'fact_check',
            colorClass: 'text-emerald-500',
            premiumBorder: 'premium-border-emerald',
            autoClear: true
        },
        'CRONOGRAMA_FERIAS': {
            title: 'PROGRAMAÇÃO ANUAL DE FÉRIAS',
            icon: 'flight_takeoff',
            colorClass: 'text-blue-500',
            premiumBorder: 'premium-border-blue',
            autoClear: true
        }
    },

    // 2. Tradução de Tipos do Banco para Configuração
    getConfig(item) {
        let typeKey = item.itemType || item.type;
        const subtipo = (item.subtipo || '').toLowerCase();
        
        // Mapeamentos específicos por subtipo ou tipo raw
        if (subtipo === 'hora_extra') return this.EVENT_CONFIG['HORA_EXTRA'];
        if (subtipo === 'aviso_ferias' || subtipo === 'ferias') return this.EVENT_CONFIG['FERIAS'];
        if (subtipo === 'folga' || subtipo === 'feriado' || subtipo === 'ferias_manual') return this.EVENT_CONFIG['FERIAS_FOLGA'];
        if (subtipo === 'mensagem' || subtipo === 'comunicado') return this.EVENT_CONFIG['COMUNICADO'];
        
        if (typeKey === 'GPS' || item.tipo === 'gps_pulse' || item.tipo === 'gps_hora') return this.EVENT_CONFIG['GPS'];
        if (typeKey === 'FERIAS' || item.tipo === 'aviso_ferias') return this.EVENT_CONFIG['CRONOGRAMA_FERIAS'];
        if (typeKey === 'FERIAS_FOLGA' || typeKey === 'FERIAS_FOLGA_GROUP') return this.EVENT_CONFIG['FERIAS_FOLGA'];
        if (typeKey === 'EVENTO') return this.EVENT_CONFIG['EVENTO'];
        if (typeKey === 'FERIAS_FOLGA' || typeKey === 'FERIAS_FOLGA_GROUP') return this.EVENT_CONFIG['FERIAS_FOLGA'];
        if (typeKey === 'justificativa_resultado') return this.EVENT_CONFIG['JUSTIFICATIVA_RESULTADO'];
        
        // Fallback para registros brutos de feriados (que possuem campo 'escopo' ou 'data' sem tipo definido)
        if (item.escopo || (item.data && !item.conteudo && !item.anotacao)) {
            return this.EVENT_CONFIG['FERIAS_FOLGA'];
        }
        
        return this.EVENT_CONFIG[typeKey] || this.EVENT_CONFIG['SISTEMA'];
    },

    // 3. Unificação de Histórico (ChronoSync Core)
    unifyHistory(anotacoes = [], justificativas = [], comunicados = [], logs = [], ferias = [], feriados = []) {
        const unified = [];

        // A. Atividades (Anotações)
        anotacoes.forEach(a => unified.push({ 
            ...a, 
            tipo: 'atividade', 
            itemType: 'ATIVIDADE',
            time: a.created_at || a.data_hora,
            content: a.justificativa_usuario || a.anotacao || ''
        }));

        // B. Justificativas
        justificativas.forEach(j => unified.push({ 
            ...j, 
            tipo: 'justificativa', 
            itemType: 'JUSTIFICATIVA',
            time: j.created_at || j.data_hora,
            content: j.justificativa_usuario || j.descricao || ''
        }));

        // C. Comunicados e Horas Extras (Filtrando resumos redundantes de feriados)
        comunicados.forEach(c => {
            const subtipo = (c.subtipo || '').toLowerCase();
            
            // Ocultar comunicados que são apenas resumos de feriados/folgas (já temos o card dedicado)
            if (subtipo === 'ferias_folgas' || subtipo === 'feriado_folga') return;

            const realType = (subtipo === 'hora_extra') ? 'hora_extra' : 'mensagem';
            const itemType = (subtipo === 'hora_extra') ? 'HORA_EXTRA' : 'COMUNICADO';
            
            unified.push({ 
                ...c, 
                tipo: realType, 
                itemType: itemType,
                time: c.created_at,
                content: c.conteudo || ''
            });
        });

        // D. Logs de Sistema (Alinhados para limpeza automática via ItemType)
        logs.forEach(l => {
            // OCULTAR redundâncias: Justificativas processadas já tem seu próprio card integrado
            if (l.tipo === 'justificativa_resultado' || l.tipo === 'justificativa' || l.tipo === 'aviso_ferias') return;

            unified.push({ 
                ...l, 
                tipo: 'sistema', 
                itemType: 'DIARIO_LOG',
                time: l.created_at || l.data_hora,
                content: l.mensagem_padrao || l.tipo_log || ''
            });
        });

        // E. Férias (Cronogramas Agrupados)
        if (ferias && ferias.length > 0) {
            const first = ferias[0];
            const logAviso = logs.find(l => l.tipo === 'aviso_ferias');

            unified.push({ 
                ...first, 
                id: logAviso ? logAviso.id : `ferias_unificado_${first.funcionario_id}`, // ID p/ ciência
                tipo: 'ferias', 
                itemType: 'CRONOGRAMA_FERIAS',
                subtipo: 'ferias',
                time: first.created_at || first.data_inicio,
                parcelas: ferias, // Inserção do array para o FeriasHistory.render()
                log_message: logAviso ? logAviso.mensagem_padrao : null,
                content: first.status === 'pendente' ? 'Proposta de férias aguardando análise.' : 
                         (first.status === 'aprovado' ? 'Cronograma de férias consolidado.' : 'Cronograma de férias necessita de ajustes.')
            });
        }

        // F. Feriados e Folgas (Agrupamento Modularizado na Grande Unificação)
        const groupedFer = (feriados || []).reduce((acc, f) => {
            const key = f.created_at || f.id;
            if (!acc[key]) acc[key] = [];
            acc[key].push(f);
            return acc;
        }, {});

        Object.entries(groupedFer).forEach(([createdAt, list]) => {
            unified.push({
                id: list[0].id,
                db: 'feriados_folgas',
                tipo: 'ferias_folgas',
                itemType: 'FERIAS_FOLGA',
                data_ref: createdAt,
                time: createdAt,
                list: list // Essencial para o FeriadosHistory.render()
            });
        });

        // Ordenar: Do mais recente para o mais antigo
        return unified.sort((a, b) => new Date(b.time) - new Date(a.time));
    },
    // 3. Regras de Edição (Integridade Corporativa)
    canEdit(item) {
        const now = new Date();
        const typeKey = item.itemType || item.type;

        // Regra 1: Férias (Parcelas)
        // - Se o cronograma estiver 'aprovado' apenas permitir edição quando
        //   a parcela mais próxima estiver a >= 20 dias (congelamento a 20 dias).
        // - Para status pendente/proposto/rejeitado permitir edição (usuário deve poder atualizar).
        if (typeKey === 'CRONOGRAMA_FERIAS') {
            if (!item.parcelas || !Array.isArray(item.parcelas)) return false;
            const status = (item.status || '').toLowerCase();
            // Se estiver congelado permanentemente, não permite edição
            if (status.indexOf('congel') !== -1) return false;
            if (status === 'aprovado') {
                return item.parcelas.every(p => {
                    const start = new Date(p.data_inicio + 'T00:00:00');
                    const diffDays = (start - now) / (1000 * 60 * 60 * 24);
                    return diffDays >= 20;
                });
            }
            // pendente/proposto/rejeitado/undefined => permitir edição (não exclusão)
            return true;
        }

        // Regra 2: Atividades e Justificativas - 24 Horas
        const createdAt = new Date(item.created_at || item.data_hora || item.time || item.time_raw || item.data_item + 'T00:00:00');
        const diffHours = (now - createdAt) / (1000 * 60 * 60);

        const editableTypes = ['ATIVIDADE', 'JUSTIFICATIVA'];
        const isEditableType = editableTypes.includes(typeKey);
        const isPending = (item.status === 'pendente' || item.status_pendencia === 'pendente');

        if (isEditableType) {
            if (typeKey === 'ATIVIDADE') return diffHours < 24;
            if (typeKey === 'JUSTIFICATIVA') return diffHours < 24 && isPending;
        }

        return false;
    },

    // 4. Inteligência de Escala (Integração com ScalesEngine)
    validatePointEvent(ponto, escala) {
        if (!escala) return { status: 'normal', msg: '' };

        const results = [];
        
        // A. Geofence
        const lat = ponto.latitude || (ponto.geolocalizacao_json ? ponto.geolocalizacao_json.lat : null);
        const lng = ponto.longitude || (ponto.geolocalizacao_json ? ponto.geolocalizacao_json.lng : null);

        if (escala.lat && escala.lng && lat && lng) {
            const dist = ScalesEngine.calculateDistance(lat, lng, escala.lat, escala.lng);
            const accuracy = ponto.accuracy || 0;
            const raio = escala.raio_geofence || ScalesEngine.GEOFENCE_DEFAULT_RADIUS;

            // Se estiver fora do raio E a precisão não justificar o erro (accuracy > raio)
            if (dist > raio && (accuracy <= raio)) {
                results.push('FORA DO RAIO');
            }

            return {
                status: results.length > 0 ? 'divergente' : 'normal',
                alerts: results,
                distancia_metros: Math.round(dist),
                raio_permitido: raio
            };
        }

        return {
            status: results.length > 0 ? 'divergente' : 'normal',
            alerts: results,
            distancia_metros: null,
            raio_permitido: null
        };
    },

    // 5. Limpeza de Diário (Marcação de Leitura)
    async clearAutoInformativos(userId, allItems, force = false) {
        if (!allItems || !allItems.length || !userId) return;
        
        // Trava de Segurança: A limpeza automática SÓ deve ocorrer na tela do Diário ou se forçado
        const isDiarioPage = window.location.pathname.endsWith('diario_funcionario.html');
        if (!isDiarioPage && !force) {
            console.log(`[EventManager] Abortando limpeza automática: Fora da tela de Diário (Path: ${window.location.pathname}).`);
            return;
        }

        console.log(`[EventManager] Analisando ${allItems.length} itens para limpeza automática de badges...`);
        
        const pendingComIds = [];
        const markSeenIfPending = (id, type, sub, item) => {
            if (!id) return;
            
            let key = `visto_${id}`;
            const t = String(type || '').toUpperCase();
            const it = String(item?.tipo || '').toUpperCase();
            const s = String(sub || '').toLowerCase();

            // Identificar se é uma Justificativa Analisada ou Férias Analisadas
            const isFeriado = t === 'FERIAS_FOLGA' || t === 'FERIAS_FOLGA_GROUP' || s === 'ferias_folgas' || s === 'feriado';
            const isJustificativa = t === 'JUSTIFICATIVA' || t === 'ABONO' || t === 'JUSTIFICATIVA_RESULTADO' || it === 'JUSTIFICATIVA' || item?.status === 'abonado' || item?.status === 'rejeitado';
            const isFeriasAnalise = t === 'CRONOGRAMA_FERIAS' || s === 'ferias' || it === 'FERIAS';

            if (isFeriado) { 
                key = `visto_feriado_${id}`; 
            } else if (isJustificativa) {
                key = `visto_justificativa_${id}`;
            } else if (isFeriasAnalise) {
                key = `visto_ferias_analise_${item.funcionario_id || id}`;
            } else if (t === 'COMUNICADO' || t === 'HORA_EXTRA' || s === 'mensagem') { 
                key = `ciente_${id}`; 
                if (s && s !== 'hora_extra' && t !== 'HORA_EXTRA') pendingComIds.push(id);
            }

            if (!localStorage.getItem(key)) {
                localStorage.setItem(key, 'true');
                console.log(`[EventManager] Limpeza: ${key} agora é visto.`);
            }
        };

        allItems.forEach(item => {
            const config = this.getConfig(item);
            if (!config || !config.autoClear) return;
            
            const sub = (item.subtipo || '').toLowerCase();
            
            // Se for um grupo de feriados/folgas, limpar TODOS os IDs da lista interna
            if (item.list && Array.isArray(item.list)) {
                item.list.forEach(subItem => markSeenIfPending(subItem.id, item.itemType, sub, subItem));
            } 
            
            // Limpar também o ID principal do evento
            markSeenIfPending(item.id || item.editId, item.itemType, sub, item);
        });

        // 3. Atualizar Banco de Dados para Comunicados Informativos (Limpeza Atômica)
        if (pendingComIds.length > 0 || userId) {
            try {
                const { supabase: sb } = await import('./supabase-config.js');
                
                const promises = [];
                if (pendingComIds.length > 0) {
                    // Marcar comunicados específicos como lidos (Sincronização Remota)
                    promises.push(sb.from('comunicados').update({ lido: true }).in('id', pendingComIds));
                }
                
                // Limpeza Global de Logs Informativos (Fundamental para o Dashboard zerar)
                // Isso marca como 'visto' todos os comunicados e alertas de justificativas deste usuário
                promises.push(sb.from('diario_logs')
                    .update({ status_pendencia: 'visto' })
                    .eq('funcionario_id', userId)
                    .eq('status_pendencia', 'pendente'));

                await Promise.all(promises);
                console.log('[EventManager] Limpeza de informativos sincronizada com o banco.');
            } catch (e) { 
                console.error('[EventManager] Falha crítica na sincronização de limpeza:', e); 
            }
        }

        // Forçar atualização das badges globalmente
        if (window.Notifications && window.Notifications.updateBadges) {
            window.Notifications.updateBadges();
        }
    }
};

// Blindagem Global: Torna o motor de eventos acessível em todas as páginas
window.EventManager = EventManager;

export { EventManager };
