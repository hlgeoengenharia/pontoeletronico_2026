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
        },
        'ALERTA_FERIADOS_FOLGAS': {
            title: 'ALERTA DE GESTÃO',
            icon: 'calendar_month',
            colorClass: 'text-primary',
            premiumBorder: 'premium-border-blue',
            autoClear: false // Resolvido manualmente via card
        },
        'PONTO': {
            title: 'REGISTRO DE PONTO',
            icon: 'history',
            colorClass: 'text-slate-100',
            premiumBorder: 'premium-border-blue',
            autoClear: true
        },
        'DIA_EXTRA': {
            title: 'CONVOCAÇÃO TRABALHO EXTRA',
            icon: 'calendar_add_on',
            colorClass: 'text-emerald-500',
            premiumBorder: 'premium-border-green',
            autoClear: false // Requer ciência/botão "Estou Ciente"
        }
    },

    // 2. Tradução de Tipos do Banco para Configuração
    getConfig(item) {
        let typeKey = item.itemType || item.type;
        const subtipo = (item.subtipo || '').toLowerCase();
        
        // Mapeamentos específicos por subtipo ou tipo raw
        if (subtipo === 'hora_extra') return this.EVENT_CONFIG['HORA_EXTRA'];
        if (subtipo === 'dia_trabalho_extra') return this.EVENT_CONFIG['DIA_EXTRA'];
        if (subtipo === 'aviso_ferias' || subtipo === 'ferias') return this.EVENT_CONFIG['FERIAS'];
        if (subtipo === 'folga' || subtipo === 'feriado' || subtipo === 'ferias_manual') return this.EVENT_CONFIG['FERIAS_FOLGA'];
        if (subtipo === 'mensagem' || subtipo === 'comunicado') return this.EVENT_CONFIG['COMUNICADO'];
        
        if (typeKey === 'DIA_EXTRA' || item.itemType === 'DIA_EXTRA') return this.EVENT_CONFIG['DIA_EXTRA'];
        
        if (typeKey === 'ALERTA_FERIADOS_FOLGAS' || item.tipo === 'alerta_feriados_folgas') return this.EVENT_CONFIG['ALERTA_FERIADOS_FOLGAS'];
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
    unifyHistory(anotacoes = [], justificativas = [], comunicados = [], logs = [], ferias = [], feriados = [], options = {}) {
        const unified = [];
        const now = new Date();
        const justificativasConsumidas = new Set();

        // A. Atividades (Anotações)
        anotacoes.forEach(a => unified.push({ 
            ...a, 
            tipo: 'atividade', 
            itemType: 'ATIVIDADE',
            time: a.created_at || a.data_hora,
            content: a.justificativa_usuario || a.anotacao || ''
        }));

        // B. Justificativas e seus Resultados
        const justificativaResultados = {};
        const justificativaResultadosByContext = [];
        logs.forEach(l => {
            if (l.tipo === 'justificativa_resultado') {
                if (l.referencia_id) {
                    justificativaResultados[l.referencia_id] = l;
                }
                // Manter lista completa para match por proximidade temporal (fallback)
                justificativaResultadosByContext.push(l);
            }
        });

        justificativas.forEach(j => {
            const result = justificativaResultados[j.id];
            unified.push({ 
                ...j, 
                tipo: 'justificativa', 
                itemType: 'JUSTIFICATIVA',
                time: j.created_at || j.data_hora,
                content: j.justificativa_usuario || j.descricao || '',
                admin_feedback: result ? result.mensagem_padrao : null,
                data_analise: result ? result.created_at : null
            });
        });

        // C. Comunicados e Horas Extras
        comunicados.forEach(c => {
            const subtipo = (c.subtipo || '').toLowerCase();
            if (subtipo === 'ferias_folgas' || subtipo === 'feriado_folga') return;

            // REGRA: Sumir em 24h (exceto se for contexto Online de Admin)
            const createdAt = new Date(c.created_at);
            const diffHours = (now - createdAt) / (1000 * 60 * 60);
            if (!options.isContextOnline && diffHours > 24) return;

            const realType = (subtipo === 'hora_extra') ? 'hora_extra' : (subtipo === 'dia_trabalho_extra' ? 'dia_trabalho_extra' : 'mensagem');
            const itemType = (subtipo === 'hora_extra') ? 'HORA_EXTRA' : (subtipo === 'dia_trabalho_extra' ? 'DIA_EXTRA' : (subtipo === 'ferias_folgas' ? 'FERIAS_FOLGA' : 'COMUNICADO'));
            
            // [SINCRONIZAÇÃO] Se for DIA EXTRA, o tempo do evento é o dia do trabalho marcado na tag
            let eventTime = c.created_at;
            const diaExtraTag = (c.conteudo || '').match(/\[DIA_EXTRA:(\d{4}-\d{2}-\d{2})\]/);
            if (diaExtraTag && diaExtraTag[1]) {
                // Forçar o horário para o início da manhã do dia agendado para aparecer corretamente na timeline
                eventTime = `${diaExtraTag[1]}T08:00:00`;
            }

            unified.push({ 
                ...c, 
                tipo: realType, 
                itemType: itemType,
                time: eventTime,
                content: c.conteudo || ''
            });
        });

        // E. Férias
        let avisoFeriasProcessado = false;
        if (ferias && ferias.length > 0) {
            const first = ferias[0];
            const logAviso = logs.find(l => l.tipo === 'aviso_ferias');
            if (logAviso) avisoFeriasProcessado = true;

            unified.push({ 
                ...first, 
                id: logAviso ? logAviso.id : `ferias_unificado_${first.funcionario_id}`,
                tipo: 'ferias', 
                itemType: 'CRONOGRAMA_FERIAS',
                subtipo: 'ferias',
                time: first.created_at || first.data_inicio,
                parcelas: ferias,
                log_message: logAviso ? logAviso.mensagem_padrao : null,
                content: first.status === 'pendente' ? 'Proposta de férias aguardando análise.' : 
                         (first.status === 'aprovado' ? 'Cronograma de férias consolidado.' : 'Cronograma de férias necessita de ajustes.')
            });
        }

        // F. Feriados e Folgas
        const groupedFer = (feriados || []).reduce((acc, f) => {
            const key = f.created_at || f.id;
            if (!acc[key]) acc[key] = [];
            acc[key].push(f);
            return acc;
        }, {});

        Object.entries(groupedFer).forEach(([createdAt, list]) => {
            // REGRA: Ativos até um dia antes do primeiro dia do evento
            const dates = list.map(f => new Date(f.data + 'T00:00:00'));
            const minDate = new Date(Math.min(...dates));
            const diffDays = (minDate - now) / (1000 * 60 * 60 * 24);
            
            // REGRA: No contexto de Diário/Histórico, mostramos todos. No Online, apenas futuros/atuais.
            if (!options.isContextOnline && !options.isContextDiario && diffDays < -1) return; // Permitir histórico no diário

            unified.push({
                id: list[0].id,
                db: 'feriados_folgas',
                tipo: 'ferias_folgas',
                itemType: 'FERIAS_FOLGA',
                data_ref: createdAt,
                time: createdAt,
                list: list
            });
        });

        // G. Logs de Sistema (Processados por último para evitar ocultação indevida)
        logs.forEach(l => {
            // OCULTAR redundâncias e itens já processados na fusão
            const isJustificativaRedundante = l.tipo === 'justificativa';
            const isFeriasRedundante = l.tipo === 'aviso_ferias' && avisoFeriasProcessado;
            
            if (isJustificativaRedundante || isFeriasRedundante) return;

            // CARD DE RESULTADO DE ANÁLISE: Renderizar com provider dedicado (ResultadoFeedbackHistory)
            if (l.tipo === 'justificativa_resultado') {
                unified.push({
                    ...l,
                    tipo: 'justificativa_resultado',
                    itemType: 'justificativa_resultado',
                    time: l.created_at || l.data_hora,
                    content: l.mensagem_padrao || ''
                });
                return;
            }

            const content = l.mensagem_padrao || l.tipo_log || '';
            const isGeofenceLog = content.toUpperCase().includes('FORA DO RAIO');

            // --- FILTRO DE LIMPEZA CHRONOSYNC ---
            // Ignorar mensagens de rotina do rastreador que NÃO sejam divergências
            const isRoutinePulse = content.includes('Localização registrada automaticamente') || 
                                   content.includes('validar sua presença') ||
                                   content.includes('TrackPulse: OK');
            
            if (isRoutinePulse && !isGeofenceLog) return;

            if (isGeofenceLog) {
                // Tenta encontrar a justificativa vinculada ao log (pelo referencia_id, proximidade temporal ou campos de referência)
                const justificativa = justificativas.find(j => {
                    const idMatch = (l.referencia_id && (String(j.id) === String(l.referencia_id) || String(j.ponto_id) === String(l.referencia_id)));
                    const jDate = new Date(j.created_at || j.data_incidente).getTime();
                    const lDate = new Date(l.created_at).getTime();
                    const timeMatch = Math.abs(lDate - jDate) / (1000 * 60) < 15;
                    return idMatch || timeMatch;
                });

                // Buscar resultado de análise: primeiro por referencia_id direto, depois por contexto temporal
                const findResult = (targetId, targetTime) => {
                    if (justificativaResultados[targetId]) return justificativaResultados[targetId];
                    // Fallback: buscar por proximidade temporal + funcionario_id
                    const tRef = new Date(targetTime).getTime();
                    return justificativaResultadosByContext.find(r => 
                        r.funcionario_id === l.funcionario_id &&
                        Math.abs(new Date(r.created_at).getTime() - tRef) / (1000 * 60 * 60) < 24
                    ) || null;
                };

                if (justificativa) {
                    justificativasConsumidas.add(justificativa.id);
                    const result = findResult(justificativa.id, justificativa.created_at || l.created_at);
                    
                    // Priorizar o status da justificativa (que é atualizado no banco após análise)
                    let finalStatus = justificativa.status || 'pendente';
                    if (result && finalStatus === 'pendente') finalStatus = 'abonado'; // Fallback se o resultado existe

                    // Extrair feedback do admin: priorizar observacao_admin direto, depois parsear do log de resultado
                    let adminFeedback = justificativa.observacao_admin || null;
                    if (!adminFeedback && result) {
                        const rawMsg = result.mensagem_padrao || '';
                        const analiseIdx = rawMsg.lastIndexOf('[ANÁLISE:');
                        adminFeedback = analiseIdx > -1 ? rawMsg.substring(rawMsg.indexOf(']', analiseIdx) + 1).trim() : rawMsg;
                    }

                    unified.push({
                        ...l,
                        tipo: 'ponto',
                        itemType: 'PONTO',
                        time: l.created_at,
                        content: content,
                        justificativa_usuario: justificativa.justificativa || justificativa.justificativa_usuario || justificativa.descricao || justificativa.conteudo || '',
                        status: finalStatus,
                        admin_feedback: adminFeedback,
                        evidencia_url: justificativa.evidencia_url || justificativa.url_anexo || null
                    });
                } else {
                    // Sem registro na tabela 'justificativas': buscar dados diretamente do ponto correspondente
                    const pontosArr = options.pontos || [];
                    const lTime = new Date(l.created_at || l.data_hora).getTime();
                    const matchedPonto = pontosArr.find(p => 
                        p.funcionario_id === l.funcionario_id &&
                        Math.abs(new Date(p.data_hora).getTime() - lTime) / (1000 * 60) < 5
                    );

                    let pontoStatus = matchedPonto?.status_validacao || 'pendente';
                    let pontoJustificativa = matchedPonto?.justificativa_usuario || '';
                    let pontoAdminFeedback = matchedPonto?.observacao_admin || null;

                    // Buscar resultado de análise pelo ID do ponto ou por proximidade temporal
                    const resultLog = matchedPonto ? findResult(matchedPonto.id, l.created_at) : findResult(l.id, l.created_at);
                    if (resultLog && pontoStatus === 'pendente') pontoStatus = 'abonado';
                    if (!pontoAdminFeedback && resultLog) {
                        const rawMsg = resultLog.mensagem_padrao || '';
                        const analiseIdx = rawMsg.lastIndexOf('[ANÁLISE:');
                        pontoAdminFeedback = analiseIdx > -1 ? rawMsg.substring(rawMsg.indexOf(']', analiseIdx) + 1).trim() : rawMsg;
                    }

                    // Limpar tags técnicas da justificativa do colaborador (ex: [EXPEDIENTE PRORROGADO:...])
                    const cleanJust = pontoJustificativa.replace(/\[EXPEDIENTE PRORROGADO:.*?\]/g, '').replace(/\[Distancia:.*?\]/g, '').trim();

                    unified.push({
                        ...l,
                        tipo: 'ponto',
                        itemType: 'PONTO',
                        time: l.created_at,
                        content: content,
                        justificativa_usuario: cleanJust || '',
                        status: pontoStatus,
                        admin_feedback: pontoAdminFeedback,
                        distancia_metros: matchedPonto?.distancia_metros || null
                    });
                }
                return;
            }

            unified.push({ 
                ...l, 
                tipo: 'sistema', 
                itemType: 'DIARIO_LOG',
                time: l.created_at || l.data_hora,
                content: content
            });
        });

        // H. Registros de Pontos (Batidas) com Justificativas (Divergências de Geofence)
        if (options.pontos && options.pontos.length > 0) {
            options.pontos.forEach(p => {
                // REGRA: Só mostrar na timeline se for FORA DO RAIO
                if (p.dentro_raio !== false && p.dentro_do_raio !== false) return;

                // Evitar duplicação se já tiver sido adicionado via LOG
                const pTime = new Date(p.data_hora).getTime();
                const alreadyAdded = unified.some(u => 
                    u.itemType === 'PONTO' && 
                    Math.abs(new Date(u.time).getTime() - pTime) / (1000 * 60) < 1
                );
                if (alreadyAdded) return;

                // Tentar encontrar a justificativa correspondente
                const justificativa = justificativas.find(j => {
                    const jTime = new Date(j.created_at || j.data_incidente || j.data_hora).getTime();
                    return Math.abs(pTime - jTime) / (1000 * 60) < 5 && !justificativasConsumidas.has(j.id);
                });

                // Buscar resultado de análise por referencia_id ou proximidade temporal
                const findResultForPonto = () => {
                    if (justificativaResultados[p.id]) return justificativaResultados[p.id];
                    return justificativaResultadosByContext.find(r => 
                        r.funcionario_id === p.funcionario_id &&
                        (r.referencia_id === p.id || Math.abs(new Date(r.created_at).getTime() - pTime) / (1000 * 60 * 60) < 24)
                    ) || null;
                };

                if (justificativa) {
                    justificativasConsumidas.add(justificativa.id);
                    const result = justificativaResultados[justificativa.id] || findResultForPonto();
                    
                    // Status: priorizar justificativa.status, depois status_validacao do ponto
                    let finalStatus = justificativa.status || 'pendente';
                    if (finalStatus === 'pendente' && p.status_validacao && p.status_validacao !== 'pendente') {
                        finalStatus = p.status_validacao; // Sync: o ponto já foi analisado
                    }
                    if (result && finalStatus === 'pendente') finalStatus = 'abonado';

                    // Extrair feedback do admin
                    let adminFeedback = justificativa.observacao_admin || p.observacao_admin || null;
                    if (!adminFeedback && result) {
                        const rawMsg = result.mensagem_padrao || '';
                        const analiseIdx = rawMsg.lastIndexOf('[ANÁLISE:');
                        adminFeedback = analiseIdx > -1 ? rawMsg.substring(rawMsg.indexOf(']', analiseIdx) + 1).trim() : rawMsg;
                    }

                    unified.push({
                        ...p,
                        id: p.id,
                        tipo: 'ponto',
                        itemType: 'PONTO',
                        time: p.data_hora,
                        content: p.tipo === 'ENTRADA' ? `Check-in realizado fora do raio` : `Check-out realizado fora do raio`,
                        justificativa_usuario: justificativa.descricao || justificativa.justificativa_usuario || p.justificativa_usuario || '',
                        status: finalStatus,
                        admin_feedback: adminFeedback,
                        evidencia_url: justificativa.evidencia_url || justificativa.url_anexo || null
                    });
                } else {
                    // Sem justificativa vinculada: usar dados diretos do ponto
                    const result = findResultForPonto();
                    let pontoStatus = p.status_validacao || 'pendente';
                    if (result && pontoStatus === 'pendente') pontoStatus = 'abonado';

                    let adminFeedback = p.observacao_admin || null;
                    if (!adminFeedback && result) {
                        const rawMsg = result.mensagem_padrao || '';
                        const analiseIdx = rawMsg.lastIndexOf('[ANÁLISE:');
                        adminFeedback = analiseIdx > -1 ? rawMsg.substring(rawMsg.indexOf(']', analiseIdx) + 1).trim() : rawMsg;
                    }

                    unified.push({
                        ...p,
                        tipo: 'ponto',
                        itemType: 'PONTO',
                        time: p.data_hora,
                        content: p.tipo === 'ENTRADA' ? `Check-in fora do raio` : `Check-out fora do raio`,
                        justificativa_usuario: p.justificativa_usuario || '',
                        status: pontoStatus,
                        admin_feedback: adminFeedback
                    });
                }
            });
        }

        // Limpeza final: Remover justificativas que foram "absorvidas" pelos cards de ponto
        const finalUnified = unified.filter(item => {
            if (item.itemType === 'JUSTIFICATIVA' && justificativasConsumidas.has(item.id)) return false;
            return true;
        });

        return finalUnified.sort((a, b) => new Date(b.time) - new Date(a.time));
    },

    // 3. Regras de Edição (Integridade Corporativa)
    canEdit(item, options = {}) {
        const now = new Date();
        const typeKey = (item.itemType || item.type || item.tipo || '').toUpperCase();
        const itemTime = new Date(item.created_at || item.time || item.data_ref);
        const diffHours = (now - itemTime) / (1000 * 60 * 60);

        // 1. Comunicados e Horas Extras (Regra Admin: Online + 24h)
        if (typeKey === 'HORA_EXTRA' || typeKey === 'COMUNICADO' || typeKey === 'MENSAGEM') {
            return options.isContextOnline === true && diffHours < 24;
        }

        // 2. Feriados e Folgas (Regra Admin: Online + 1 dia antes do evento)
        if (typeKey === 'FERIAS_FOLGA') {
            if (!options.isContextOnline) return false;
            
            // Buscar a data mais próxima do evento na lista agrupada
            const list = item.list || [item];
            const dates = list.map(f => {
                const d = f.data || item.data;
                return d ? new Date(d + 'T00:00:00') : now;
            });
            const minDate = new Date(Math.min(...dates));
            
            // O botão some no início do dia anterior ao evento (24h antes do 00:00:00 do feriado)
            const deadline = new Date(minDate.getTime() - (24 * 60 * 60 * 1000));
            return now < deadline;
        }

        // 3. Regra Funcionário: Justificativas (Pendente e < 24h)
        if (typeKey === 'JUSTIFICATIVA') {
            const isPending = (item.status === 'pendente' || item.status_pendencia === 'pendente');
            return isPending && diffHours < 24;
        }

        // 4. Regra Funcionário: Atividades (< 24h)
        if (typeKey === 'ATIVIDADE') {
            return diffHours < 24;
        }

        // 5. Regra Férias: Até 20 dias antes (se aprovado) ou qualquer momento se pendente
        if (typeKey === 'CRONOGRAMA_FERIAS') {
            if (!item.parcelas) return true; // Pendente de registro inicial
            if (item.status === 'aprovado') {
                return item.parcelas.every(p => {
                    const start = new Date(p.data_inicio + 'T00:00:00');
                    return (start - now) / (1000 * 60 * 60 * 24) >= 20;
                });
            }
            return true;
        }

        return false;
    },

    // 4. Inteligência de Escala (Integração com ScalesEngine)
    validatePointEvent(ponto, escala, setor = null) {
        if (!escala) return { status: 'normal', msg: '' };

        const results = [];
        
        // A. Geofence - Prioridade: escala > setor > default
        const lat = ponto.latitude || (ponto.geolocalizacao_json ? ponto.geolocalizacao_json.lat : null);
        const lng = ponto.longitude || (ponto.geolocalizacao_json ? ponto.geolocalizacao_json.lng : null);

        // Normalização: Supabase pode retornar setor como objeto ou array.
        const s = Array.isArray(setor) ? setor[0] : setor;

        const escalaLat = escala.lat || escala.latitude || s?.latitude;
        const escalaLng = escala.lng || escala.longitude || s?.longitude;
        const escalaRaio = escala.raio_geofence || escala.raio_geofence_metros || s?.raio || ScalesEngine.GEOFENCE_DEFAULT_RADIUS;

        if (escalaLat && escalaLng && lat && lng) {
            const dist = ScalesEngine.calculateDistance(lat, lng, escalaLat, escalaLng);
            const accuracy = ponto.accuracy || 0;
            const raio = escalaRaio;

            // REGRA CUMPRIDA: Se estiver fora do raio ou com um GPS muito impreciso (Ex: Desktop/Wi-Fi > 100m)
            if (dist > raio || accuracy > 100) {
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
                // PROTEGE justificativa_resultado: esses logs precisam manter status_pendencia='pendente'
                // até que o funcionário os visualize no Diário (o JustificativasCounter depende disso)
                promises.push(sb.from('diario_logs')
                    .update({ status_pendencia: 'visto' })
                    .eq('funcionario_id', userId)
                    .eq('status_pendencia', 'pendente')
                    .neq('tipo', 'justificativa_resultado'));

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
