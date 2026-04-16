import { supabase } from './supabase-config.js';
import { ScalesEngine } from './scales-engine.js';
import { EventManager } from './event-manager.js';

/**
 * PontoDiagnostic - ChronoSync
 * Motor de auditoria para validar por que o botão de ponto está habilitado ou bloqueado.
 * Desenvolvido para uso na tela de diagnóstico e suporte técnico.
 */
export const PontoDiagnostic = {

    /**
     * Executa a auditoria completa para um funcionário específico
     * @param {string} employeeId ID do funcionário a ser auditado
     */
    async evaluate(employeeId) {
        if (!employeeId) return { error: "ID do funcionário não fornecido." };

        try {
            // 1. Carregar dados completos do funcionário
            const { data: user, error: userError } = await supabase
                .from('funcionarios')
                .select('*, setores!funcionarios_setor_id_fkey(*), escalas!escala_id(*)')
                .eq('id', employeeId)
                .single();

            if (userError || !user) throw new Error("Funcionário não encontrado.");

            const now = new Date();
            const todayStr = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
            const dayOfWeek = now.getDay();
            const currentTime = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

            // 2. Buscar Feriados/Folgas para hoje
            const { data: feriadoHoje } = await supabase
                .from('feriados_folgas')
                .select('*')
                .or(`funcionario_id.eq.${employeeId},setor_id.eq.${user.setor_id},escopo.eq.geral`)
                .eq('data', todayStr)
                .maybeSingle();

            // 3. Buscar Férias Ativas
            const { data: emFerias } = await supabase
                .from('ferias')
                .select('*')
                .eq('funcionario_id', employeeId)
                .eq('status', 'aprovado')
                .lte('data_inicio', todayStr)
                .gte('data_fim', todayStr);
            const isOnVacation = emFerias && emFerias.length > 0;

            // 4. Buscar Batidas de Hoje (Status do Turno)
            const { data: batidasHoje } = await supabase
                .from('pontos')
                .select('*')
                .eq('funcionario_id', employeeId)
                .gte('data_hora', `${todayStr}T00:00:00`)
                .order('data_hora', { ascending: true });

            const isOnline = batidasHoje && batidasHoje.length % 2 !== 0;

            // 5. Definir Escala Ativa (Priorizar Personalização)
            const activeScale = user.personalizacao_escala
                ? { ...user.escalas, ...user.personalizacao_escala }
                : user.escalas;

            // 6. Buscar Pulsos de Rastreio (Se regime for Externo)
            let pulsesCount = 0;
            if (activeScale?.rastreio_horario) {
                const { count } = await supabase
                    .from('diario_logs')
                    .select('*', { count: 'exact', head: true })
                    .eq('funcionario_id', employeeId)
                    .eq('tipo', 'gps_pulse')
                    .gte('created_at', `${todayStr}T00:00:00`);
                pulsesCount = count || 0;
            }

            // 6. Buscar Minutos Extras (Prorrogação HE)
            const extraMin = await this.getExtraMinutes(employeeId, user.setor_id);

            // 7. Avaliar Regras
            const rules = {
                vinc_funcionario: {
                    label: "Funcionário Ativo",
                    status: (user.status || 'Ativo').toLowerCase() === 'ativo' ? 'OK' : 'BLOQUEADO',
                    detail: `Status atual: ${user.status || 'Ativo'}`,
                    passed: (user.status || 'Ativo').toLowerCase() === 'ativo'
                },
                ferias_ativas: {
                    label: "Férias Ativas",
                    status: isOnVacation ? 'SIM' : 'NÃO',
                    detail: isOnVacation ? `Período: ${emFerias[0].data_inicio} até ${emFerias[0].data_fim}` : "Funcionário em atividade normal",
                    passed: !isOnVacation
                },
                biometria_facial: {
                    label: "Biometria Facial",
                    status: user.biometria_cadastrada ? 'OK' : 'PENDENTE',
                    detail: user.biometria_cadastrada ? "Cadastro facial ativo no sistema" : "Obrigatório cadastrar para liberar o ponto",
                    passed: !!user.biometria_cadastrada
                },
                vinc_escala: {
                    label: "Escala Atribuída",
                    status: activeScale ? 'OK' : 'BLOQUEADO',
                    detail: activeScale ? `Escala: ${activeScale.nome || 'Personalizada'}` : "Nenhuma escala vinculada",
                    passed: !!activeScale
                },
                config_jornada: {
                    label: "Configuração de Jornada",
                    status: activeScale?.possui_almoco ? '2 TURNOS' : '1 TURNO',
                    detail: activeScale?.possui_almoco ? "Dedução automática de 1h de almoço" : "Jornada contínua (sem intervalo)",
                    description: `Regime: ${activeScale?.regime || 'Não definido'}`,
                    passed: true
                },
                rastreio_externo: {
                    label: "Rastreio Externo",
                    status: activeScale?.rastreio_horario ? 'ATIVO' : 'DESATIVADO',
                    detail: activeScale?.rastreio_horario ? `${pulsesCount} pulsos GPS enviados hoje` : "Apenas batidas manuais autorizadas",
                    passed: true
                },
                dia_escala: {
                    label: "Dia Válido na Escala",
                    status: 'PENDENTE',
                    detail: "---",
                    passed: false
                },
                feriado_hoje: {
                    label: "Feriado/Folga Hoje",
                    status: feriadoHoje ? 'SIM' : 'NÃO',
                    detail: feriadoHoje ? `Motivo: ${feriadoHoje.tipo} (${feriadoHoje.descricao})` : "Dia de trabalho comum",
                    passed: !feriadoHoje
                },
                janela_horario: {
                    label: "Dentro da Janela Ativa",
                    status: 'NÃO',
                    detail: "---",
                    passed: false
                },
                gps_raio: {
                    label: "GPS Dentro do Raio",
                    status: 'PENDENTE',
                    detail: "Aguardando sinal...",
                    passed: false
                }
            };

            // 8. Lógica de Dia de Escala
            if (activeScale) {
                const projected = ScalesEngine.projectBaseDays(activeScale, user.data_inicio_vigencia || activeScale.data_inicio_vigencia, now.getMonth(), now.getFullYear());
                const isWorkDay = projected.includes(todayStr);
                rules.dia_escala.status = isWorkDay ? 'OK' : 'BLOQUEADO';
                rules.dia_escala.detail = isWorkDay ? "Hoje é dia de trabalho previsto" : "Hoje não consta na escala oficial";
                rules.dia_escala.passed = isWorkDay;

                // 9. Lógica de Janela de Horário
                if (activeScale.horario_entrada) {
                    const winDetails = ScalesEngine.calculateWindowDetails(activeScale, extraMin);
                    const isInWindow = ScalesEngine.isInActivationWindow(activeScale, 'check-in', extraMin, now);

                    rules.janela_horario.status = isInWindow ? 'SIM' : 'NÃO';
                    rules.janela_horario.detail = winDetails ? `Janela: ${winDetails.antes.horario} até ${winDetails.prorrogacao.horario}` : "Horário não definido";
                    rules.janela_horario.passed = isInWindow;

                    // Detalhes extras requisitados no formato da resposta
                    rules.janela_horario.config = {
                        entrada_escala: winDetails.entrada,
                        saida_escala: winDetails.saida,
                        janela_antes: winDetails.antes.minutos,
                        janela_depois: winDetails.depois.minutos,
                        tolerancia: winDetails.tolerancia.minutos,
                        prorrogacao_he: extraMin
                    };
                }
            }

            // 10. Lógica de GPS
            try {
                if (activeScale && activeScale.restrito_gps) {
                    const targetLat = activeScale.lat || user.setores?.latitude;
                    const targetLng = activeScale.lng || user.setores?.longitude;

                    if (targetLat && targetLng) {
                        const pos = await this.getCurrentLocation();
                        const dist = ScalesEngine.calculateDistance(pos.lat, pos.lng, targetLat, targetLng);
                        const raio = activeScale.raio_geofence || activeScale.raio || user.setores?.raio || ScalesEngine.GEOFENCE_DEFAULT_RADIUS;

                        const isInside = dist <= raio;
                        rules.gps_raio.status = isInside ? 'SIM' : 'NÃO';
                        rules.gps_raio.detail = `Distância: ${Math.round(dist)}m (Limite: ${raio}m)`;
                        rules.gps_raio.passed = isInside;
                    } else {
                        // MODO FAIL-SAFE: Se exigir GPS mas não houver coordenadas cadastradas, não bloqueia o botão.
                        rules.gps_raio.status = 'ISENTO*';
                        rules.gps_raio.detail = "GPS exigido, mas sem coordenadas cadastradas (Escala/Setor). Liberado por precaução.";
                        rules.gps_raio.passed = true;
                    }
                } else {
                    rules.gps_raio.status = 'ISENTO';
                    rules.gps_raio.detail = "Geofencing não ativado para esta escala";
                    rules.gps_raio.passed = true;
                }
            } catch (e) {
                rules.gps_raio.status = 'ERRO';
                rules.gps_raio.detail = "Falha ao obter localização GPS";
                rules.gps_raio.passed = false;
            }

            // 11. Resultado Final
            const mandatoryRules = ['vinc_funcionario', 'ferias_ativas', 'biometria_facial', 'vinc_escala', 'dia_escala', 'feriado_hoje', 'janela_horario', 'gps_raio'];
            const allPassed = mandatoryRules.every(key => rules[key].passed);

            return {
                summary: {
                    employee: user.nome_completo,
                    nickname: user.nickname || user.nome_completo.split(' ')[0],
                    date: todayStr.split('-').reverse().join('/'),
                    time: currentTime,
                    result: allPassed ? 'BOTÃO ATIVO' : 'BOTÃO BLOQUEADO',
                    resultClass: allPassed ? 'text-emerald-500' : 'text-rose-500',
                    nextAction: isOnline ? 'FINALIZAR TURNO' : 'REGISTRAR PONTO'
                },
                rules: rules,
                rawUser: user
            };

        } catch (err) {
            console.error('[PontoDiagnostic] erro:', err);
            return { error: err.message };
        }
    },

    /**
     * Busca minutos extras autorizados (HE) para o período
     */
    async getExtraMinutes(userId, sectorId) {
        try {
            const fullDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

            // Montagem segura do OR para evitar erro se sectorId for nulo/inválido
            const orConditions = [`destinatario_id.eq.${userId}`, `tipo.eq.geral`];
            if (sectorId && sectorId !== '00000000-0000-0000-0000-000000000000') {
                orConditions.push(`setor_id.eq.${sectorId}`);
            }
            const orQuery = orConditions.join(',');

            const { data: coms, error } = await supabase.from('comunicados')
                .select('conteudo')
                .or(orQuery)
                .eq('subtipo', 'hora_extra')
                .gte('created_at', fullDayAgo)
                .order('created_at', { ascending: false })
                .limit(1); // Otimização: Apenas o comunicado mais recente é necessário

            if (error) throw error;

            if (coms && coms.length > 0) {
                const match = coms[0].conteudo.match(/\[LIMITE:(\d+)\]/);
                return match ? parseInt(match[1], 10) : 120;
            }
        } catch (e) { console.warn('[PontoDiagnostic] Erro ao buscar HE:', e); }
        return 0;
    },

    /**
     * Helper para obter localização atual via Promise
     */
    getCurrentLocation() {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) return reject(new Error("Browser sem GPS"));
            navigator.geolocation.getCurrentPosition(
                (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
                (err) => reject(err),
                { enableHighAccuracy: true, timeout: 5000 }
            );
        });
    }
};

window.PontoDiagnostic = PontoDiagnostic;
