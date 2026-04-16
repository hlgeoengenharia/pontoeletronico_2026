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
            .select('biometria_cadastrada, biometria_token')
            .eq('id', user.id)
            .single();

        const parsedTemplate = BiometricHelper.parseTemplate(data?.biometria_token || '');
        if (error || !data || !data.biometria_cadastrada || !parsedTemplate.valid) {
            console.warn('[Compliance] Biometria nao detectada. Redirecionando...');
            return false;
        }

        return true;
    },

    /**
     * Aplica penalidades apos rejeicao do Admin/Gestor.
     */
    async processRejection(item, type, adminObs) {
        console.log(`[BusinessRules] Processando rejeicao (${type}):`, item?.id);

        if (!item || !item.id) {
            console.warn('[BusinessRules] Item inválido, ignorando penalidade');
            return { success: false, skipped: true };
        }

        try {
            const punchType = item.tipo || 'check-in';
            const funcionarioId = item.funcionario_id;

            if (punchType === 'check-in') {
                await this.createAbsenceLog(funcionarioId, item.data_hora, adminObs);
            } else {
                await this.applyHalfJourneyPenalty(item, adminObs);
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

    async applyHalfJourneyPenalty(item, adminObs) {
        const { data: user } = await supabase
            .from('funcionarios')
            .select('*, escalas(*)')
            .eq('id', item.funcionario_id)
            .single();

        if (!user || !user.escalas) {
            console.warn('[BusinessRules] Impossivel calcular penalidade: escala nao encontrada.');
            return;
        }

        const escala = user.escalas;
        const [hE, mE] = (escala.horario_entrada || '08:00:00').split(':').map(Number);
        const workMinutes = ScalesEngine.calculateDailyWorkMinutes(escala);
        const halfMinutes = Math.floor(workMinutes / 2);

        const departureTime = new Date(item.data_hora); // Baseado na entrada
        departureTime.setHours(hE, mE, 0, 0);
        departureTime.setMinutes(departureTime.getMinutes() + halfMinutes);

        // Se o item já existir (rejeição de checkout manual), atualizamos. 
        // Se formos criar um checkout automático, inserimos.
        if (item.tipo === 'check-out' && item.id) {
            await supabase.from('pontos').update({
                data_hora: departureTime.toISOString(),
                status_validacao: 'rejeitado',
                justificativa_usuario: `[PENALIDADE: MEIO-TURNO APLICADO] ${item.justificativa_usuario || ''}`,
                comentario_gestor: adminObs
            }).eq('id', item.id);
        } else {
            // Check-out Automático: Sincronizado c/ esquema real do banco (latitude/longitude)
            await supabase.from('pontos').insert([{
                funcionario_id: item.funcionario_id,
                data_hora: departureTime.toISOString(),
                tipo: 'check-out',
                status_validacao: 'pendente',
                dentro_do_raio: true,
                justificativa_usuario: `[SISTEMA] Checkout automático aplicado por esquecimento (Penalidade 50%).`,
                comentario_gestor: adminObs,
                latitude: 0,
                longitude: 0,
                biometria_verificada: true,
                biometria_score: 1.0,
                biometria_metodo: 'SISTEMA',
                biometria_timestamp: new Date().toISOString()
            }]);
        }

        await supabase.from('diario_logs').insert([{
            funcionario_id: item.funcionario_id,
            data_hora: new Date().toISOString(),
            tipo: 'sistema',
            status_pendencia: 'pendente',
            mensagem_padrao: `[PENALIDADE] Ponto de ${new Date(item.data_hora).toLocaleDateString()} encerrado automaticamente por esquecimento. Motivo: ${adminObs}`
        }]);
    },

    /**
     * Autorresolução: Fecha pontos abertos de dias anteriores baseando-se na janela técnica.
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

            if (!lastPunch || lastPunch.tipo === 'check-out') return null;

            // 1.1 Verificação de duplicidade: Já existe um Checkout Automático PENDENTE para este evento?
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

            // 2. Verificar se é de dia anterior
            const punchDate = new Date(lastPunch.data_hora);
            const now = new Date();
            const todayStr = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
            const punchDateStr = new Date(punchDate.getTime() - (punchDate.getTimezoneOffset() * 60000)).toISOString().split('T')[0];

            if (punchDateStr >= todayStr) return null;

            // 3. Validar se a janela técnica já fechou
            const escala = user.escalas;
            if (!escala) return null;

            // Buscar HE para aquele dia
            const extraMin = await this.getExtraMinutesForDate(user.id, user.setor_id, punchDateStr);
            const win = ScalesEngine.calculateWindowDetails(escala, extraMin);
            
            if (!win) return null;

            // O corte ocorre após a 'prorrogacao' (Saída + JanelaDepois + HE)
            const [hP, mP] = win.prorrogacao.horario.split(':').map(Number);
            const closingTime = new Date(punchDate);
            closingTime.setHours(hP, mP, 0, 0);

            // Se for troca de dia (ex: sai as 02h), ajustamos a data do fechamento
            if (hP < 12 && punchDate.getHours() > 12) {
                closingTime.setDate(closingTime.getDate() + 1);
            }

            if (now > closingTime) {
                console.log('[Compliance] Detectado ponto órfão. Aplicando autorresolução...');
                await this.applyHalfJourneyPenalty(lastPunch, 'Ponto esquecido (fechamento automático pela janela técnica)');
                return { resolved: true, date: punchDateStr };
            }

            return null;
        } catch (e) {
            console.error('[Compliance] Erro na autorresolução:', e);
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
