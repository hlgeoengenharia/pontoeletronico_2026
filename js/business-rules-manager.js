import { supabase } from './supabase-config.js';
import { ScalesEngine } from './scales-engine.js';
import { BiometricHelper } from './biometric-helper.js';

/**
 * BusinessRulesManager - Modulo de conformidade ChronoSync.
 * Gerencia penalidades, redirecionamentos e validacoes de biometria.
 */
export const BusinessRulesManager = {

    /**
     * Verifica se o usuario tem biometria cadastrada e em formato valido.
     */
    async checkBiometryPreflight(user) {
        if (!user || user.nivel_acesso === 'Admin') return true;

        const { data, error } = await supabase
            .from('funcionarios')
            .select(`
                id,
                identidades_globais!inner (
                    biometria_cadastrada, 
                    biometria_token
                )
            `)
            .eq('id', user.id)
            .single();

        const ident = data?.identidades_globais;
        const parsedTemplate = BiometricHelper.parseTemplate(ident?.biometria_token || '');
        
        if (error || !data || !ident || !ident.biometria_cadastrada || !parsedTemplate.valid) {
            console.warn('[Compliance] Biometria nao detectada ou invalida na Identidade Global. Redirecionando...');
            return false;
        }

        return true;
    },

    /**
     * Aplica penalidades apos rejeicao do Admin/Gestor.
     */
    async processRejection(item, type, adminObs) {
        console.log(`[BusinessRules] Processando rejeição (${type}):`, item?.id);

        if (!item || !item.id) {
            console.warn('[BusinessRules] Item inválido, ignorando penalidade');
            return { success: false, skipped: true };
        }

        try {
            const punchType = item.tipo || 'check-in';
            const funcionarioId = item.funcionario_id;

            // Se for um log de SISTEMA (esquecimento), precisamos encontrar o PONTO de check-out correspondente
            if (type === 'SISTEMA' || type === 'ALERTA_MENSAL') {
                const punchDate = item.data_hora ? item.data_hora.split('T')[0] : new Date().toISOString().split('T')[0];
                const { data: relatedPunch } = await supabase
                    .from('pontos')
                    .select('*')
                    .eq('funcionario_id', funcionarioId)
                    .eq('tipo', 'check-out')
                    .gte('data_hora', `${punchDate}T00:00:00`)
                    .lte('data_hora', `${punchDate}T23:59:59`)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .maybeSingle();

                if (relatedPunch) {
                    await this.applyHalfJourneyPenalty(relatedPunch, adminObs);
                } else {
                    console.warn('[BusinessRules] Nenhum ponto de check-out encontrado para vincular à rejeição do log.');
                }
            } else {
                if (punchType === 'check-in') {
                    await this.createAbsenceLog(funcionarioId, item.data_hora, adminObs);
                } else {
                    await this.applyHalfJourneyPenalty(item, adminObs);
                }
            }

            return { success: true };
        } catch (err) {
            console.error('[BusinessRules] Erro ao aplicar penalidade:', err);
            throw err;
        }
    },

    async createAbsenceLog(funcionarioId, dataHora, adminObs) {
        const dateStr = new Date(dataHora).toLocaleDateString('pt-BR');
        
        await supabase.from('diario_logs').insert([{
            funcionario_id: funcionarioId,
            data_hora: new Date().toISOString(),
            tipo: 'falta',
            status_pendencia: 'visto',
            mensagem_padrao: `[PENALIDADE: FALTA INJUSTIFICADA] Sua entrada em ${dateStr} foi rejeitada pelo gestor. Motivo: ${adminObs}`
        }]);
    },

    async applyHalfJourneyPenalty(item, adminObs, escala = null) {
        let activeEscala = escala;

        if (!activeEscala) {
            const { data: user } = await supabase
                .from('funcionarios')
                .select('*, escalas(*)')
                .eq('id', item.funcionario_id)
                .single();
            activeEscala = user?.escalas;
        }

        if (!activeEscala) {
            console.warn('[BusinessRules] Impossível calcular penalidade: escala não encontrada.');
            return;
        }

        const [hE, mE] = (activeEscala.horario_entrada || '08:00:00').split(':').map(Number);
        const workMinutes = ScalesEngine.calculateDailyWorkMinutes(activeEscala);
        const halfMinutes = Math.floor(workMinutes / 2);

        // Penalidade: Define o horário como Entrada Prevista + 50% da Jornada
        const penaltyTime = new Date(item.data_hora || item.created_at);
        penaltyTime.setHours(hE, mE, 0, 0);
        penaltyTime.setMinutes(penaltyTime.getMinutes() + halfMinutes);

        // Se o item já existir (rejeição de checkout automático ou manual), atualizamos. 
        if (item.id) {
            await supabase.from('pontos').update({
                data_hora: penaltyTime.toISOString(),
                status_validacao: 'rejeitado',
                justificativa_usuario: `[PENALIDADE: MEIO-TURNO APLICADO] ${item.justificativa_usuario || ''}`,
                comentario_gestor: adminObs
            }).eq('id', item.id);
        }
    },

    /**
     * Cria um encerramento automático baseado na Saída Prevista (100% jornada)
     */
    async createAutoExitAtScheduledTime(lastPunch, escala, adminObs) {
        const [hS, mS] = (escala.horario_saida || '14:00:00').split(':').map(Number);
        
        const scheduledExit = new Date(lastPunch.data_hora);
        scheduledExit.setHours(hS, mS, 0, 0);

        // Se a saída for menor que a entrada (virada de dia), avançar 1 dia
        if (scheduledExit < new Date(lastPunch.data_hora)) {
            scheduledExit.setDate(scheduledExit.getDate() + 1);
        }

        const { data: newPoint, error } = await supabase.from('pontos').insert([{
            funcionario_id: lastPunch.funcionario_id,
            data_hora: scheduledExit.toISOString(),
            tipo: 'check-out',
            status_validacao: 'pendente',
            dentro_do_raio: true,
            justificativa_usuario: `[SISTEMA] Checkout automático realizado (Esquecimento). Baseado na Saída Prevista: ${escala.horario_saida.substring(0,5)}.`,
            comentario_gestor: adminObs,
            latitude: 0,
            longitude: 0,
            biometria_verificada: true,
            biometria_score: 1.0,
            biometria_metodo: 'SISTEMA',
            biometria_timestamp: new Date().toISOString()
        }]).select().single();

        if (error) throw error;

        // Registrar o log de pendência para o diário/gestor
        await supabase.from('diario_logs').insert([{
            funcionario_id: lastPunch.funcionario_id,
            data_hora: new Date().toISOString(),
            tipo: 'sistema',
            status_pendencia: 'pendente',
            mensagem_padrao: `[PENALIDADE] Ponto de ${new Date(lastPunch.data_hora).toLocaleDateString()} encerrado automaticamente por esquecimento. O funcionário será penalizado com corte de 50% de sua jornada de trabalho caso este registro seja REJEITADO. Motivo: ${adminObs}`
        }]);

        return newPoint;
    },

    /**
     * Autorresolução: Fecha pontos abertos (órfãos) baseando-se no limite de prorrogação.
     * Funciona tanto para dias anteriores quanto para o dia atual, desde que o tempo limite tenha expirado.
     */
    async resolveOrphanedPunches(user) {
        if (!user || !user.id || user.nivel_acesso === 'Admin') return null;

        try {
            // 1. Buscar última batida
            const { data: lastPunch } = await supabase
                .from('pontos')
                .select('*')
                .eq('funcionario_id', user.id)
                .order('data_hora', { ascending: false })
                .limit(1)
                .maybeSingle();

            // Se não houver ponto ou for checkout, não há nada a resolver
            if (!lastPunch || lastPunch.tipo === 'check-out') return null;

            const now = new Date();
            const punchDate = new Date(lastPunch.data_hora);
            const punchDateStr = punchDate.toISOString().split('T')[0];

            // 2. Verificar se já existe um Checkout Automático PENDENTE para este evento
            const { data: existingAuto } = await supabase
                .from('pontos')
                .select('id')
                .eq('funcionario_id', user.id)
                .eq('tipo', 'check-out')
                .ilike('justificativa_usuario', '%[SISTEMA]%')
                .gte('data_hora', lastPunch.data_hora)
                .limit(1)
                .maybeSingle();

            if (existingAuto) {
                console.log('[Compliance] Autorresolução já processada ou pendente para este evento.');
                return null;
            }

            // 3. Validar se a prorrogação técnica já fechou
            const escala = user.escalas;
            if (!escala) return null;

            // Buscar HE para o dia do ponto (seja hoje ou anterior)
            const extraMin = await this.getExtraMinutesForDate(user.id, user.setor_id, punchDateStr);
            const closingTime = ScalesEngine.getShiftEndWithHE(escala, extraMin, punchDate);
            
            if (!closingTime) return null;

            console.log(`[Compliance] Verificando Ponto Órfão: Início ${lastPunch.data_hora}, Limite Janela: ${closingTime.toLocaleTimeString()}`);

            // REGRA DE OURO: Se AGORA for maior que o LIMITE DE PRORROGAÇÃO, fecha automaticamente.
            if (now > closingTime) {
                console.log(`[Compliance] !!! PONTO ÓRFÃO DETECTADO !!! Agora (${now.toLocaleTimeString()}) > Limite (${closingTime.toLocaleTimeString()})`);
                try {
                    await this.createAutoExitAtScheduledTime(lastPunch, escala, 'Esquecimento de registro (Fechamento Automático por Prorrogação Esgotada)');
                    console.log(`[Compliance] Sucesso: Ponto de ${punchDateStr} resolvido com Saída Prevista.`);
                    return { resolved: true, date: punchDateStr };
                } catch (err) {
                    console.error(`[Compliance] Erro ao realizar checkout automático:`, err);
                }
            }

            return null;
        } catch (e) {
            console.error('[Compliance] Erro fatal na autorresolução:', e);
            return null;
        }
    },

    async getExtraMinutesForDate(userId, sectorId, dateStr) {
        try {
            const { data } = await supabase
                .from('comunicados')
                .select('conteudo')
                .or(`destinatario_id.eq.${userId},tipo.eq.geral,setor_id.eq.${sectorId || '0'}`)
                .eq('subtipo', 'hora_extra')
                .gte('created_at', `${dateStr}T00:00:00`)
                .lte('created_at', `${dateStr}T23:59:59`)
                .order('created_at', { ascending: false })
                .limit(1);

            if (data && data.length > 0) {
                const match = (data[0].conteudo || '').match(/\[LIMITE:(\d+)\]/);
                return match ? parseInt(match[1], 10) : 0;
            }
            return 0;
        } catch (e) { return 0; }
    }
};

window.BusinessRulesManager = BusinessRulesManager;
