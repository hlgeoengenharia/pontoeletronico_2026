/**
 * Scales Engine - ChronoSync
 * Lógica de Projeção e Cálculos de Escalas Híbridas
 */

const ScalesEngine = {
    // Constantes Globais de Geofence
    GEOFENCE_DEFAULT_RADIUS: 150, // metros
    GPS_MIN_ACCURACY: 80,         // metros (limite para considerar sinal confiável)

    /**
     * Projeta os dias de trabalho para um mês/ano específico
     * @param {Object} escala Objeto da escala (tipo, config, etc)
     * @param {string} dataInicio Vigência (YYYY-MM-DD)
     * @param {number} month 0-11
     * @param {number} year YYYY
     */
    projectBaseDays(escala, dataInicio, month, year) {
        if (!escala) return [];
        const days = [];
        const startDay = new Date(year, month, 1);
        const endDay = new Date(year, month + 1, 0);
        
        const toLocaleISO = (date) => {
            const y = date.getFullYear();
            const m = String(date.getMonth() + 1).padStart(2, '0');
            const d = String(date.getDate()).padStart(2, '0');
            return `${y}-${m}-${d}`;
        };

        let startDate;
        if (dataInicio) {
            try {
                if (dataInicio.includes('T')) {
                    startDate = new Date(dataInicio);
                } else {
                    const [yV, mV, dV] = dataInicio.split('-').map(Number);
                    startDate = new Date(yV, mV - 1, dV);
                }
                if (isNaN(startDate.getTime())) startDate = null;
                else startDate.setHours(0, 0, 0, 0);
            } catch (e) {
                console.error("Scale Engine: Error parsing startDate", dataInicio);
                startDate = null;
            }
        }

        for (let d = new Date(startDay); d <= endDay; d.setDate(d.getDate() + 1)) {
            const dateStr = toLocaleISO(d);

            if (escala.tipo_escala === 'semanal' || escala.dias_selecionados) {
                const dayOfWeek = d.getDay();
                // Suporta tanto dias_padrao (do template) quanto dias_selecionados (da personalização)
                const diasTrabalho = (escala.dias_selecionados || escala.dias_padrao || []).map(Number);
                if (diasTrabalho.includes(dayOfWeek)) {
                    days.push(dateStr);
                }
            } 
            else if (escala.tipo_escala === 'ciclo') {
                if (!startDate) continue; // Ciclo exige vigência
                const trabalho = Number(escala.ciclo_config?.trabalho_total || 12);
                const folga = Number(escala.ciclo_config?.folga_total || 36);
                const cycleHours = trabalho + folga;

                const dayStart = new Date(d);
                dayStart.setHours(0, 0, 0, 0);
                
                let refStart = new Date(startDate);

                if (escala.tipo_repeticao === 'fixa') {
                    const isEvenStart = startDate.getDate() % 2 === 0;
                    refStart = new Date(year, month, isEvenStart ? 2 : 1);
                    refStart.setHours(0, 0, 0, 0);
                }

                const msSinceStart = dayStart.getTime() - refStart.getTime();
                const hoursSinceStart = msSinceStart / (1000 * 60 * 60);

                let isWorkDay = false;
                for (let h = 0; h < 24; h++) {
                    const currentHourInCycle = hoursSinceStart + h;
                    const positionInCycle = (currentHourInCycle >= 0)
                        ? (currentHourInCycle % cycleHours)
                        : (cycleHours + (currentHourInCycle % cycleHours)) % cycleHours;

                    if (positionInCycle < trabalho) {
                        isWorkDay = true;
                        break;
                    }
                }

                if (isWorkDay) {
                    days.push(dateStr);
                }
            }
        }
        return days;
    },

    /**
     * Calcula a jornada diária baseada na carga semanal e dias selecionados
     */
    calculateDailyJourney(weeklyHours, daysCount) {
        if (!daysCount || daysCount === 0) return 0;
        return (weeklyHours / daysCount).toFixed(2);
    },

    /**
     * Calcula a distância entre dois pontos (Haversine) em metros
     */
    calculateDistance(lat1, lon1, lat2, lon2) {
        if (!lat1 || !lon1 || !lat2 || !lon2) return 999999;
        const R = 6371e3; // Raio da Terra em metros
        const φ1 = lat1 * Math.PI / 180;
        const φ2 = lat2 * Math.PI / 180;
        const Δφ = (lat2 - lat1) * Math.PI / 180;
        const Δλ = (lon2 - lon1) * Math.PI / 180;

        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return R * c;
    },

    /**
     * Verifica se o horário atual é divergente (Atraso no In ou Antecipado no Out)
     * @param {string} type "check-in" ou "check-out"
     * @param {string} scheduledTime "HH:mm:ss"
     * @param {number} tolMinutos Minutos de tolerância
     * @returns {boolean} true se for divergente (fora da regra)
     */
    isDivergentTime(type, scheduledTime, tolMinutos = 15) {
        if (!scheduledTime) return false;

        const now = new Date();
        const [h, m] = scheduledTime.split(':').map(Number);

        const scheduled = new Date();
        scheduled.setHours(h, m, 0, 0);

        const diffMinutes = (now - scheduled) / (1000 * 60);

        if (type === 'check-in') {
            // Divergente APENAS se chegar DEPOIS do horário + tolerância (Atraso)
            return diffMinutes > tolMinutos;
        } else if (type === 'check-out') {
            // Divergente APENAS se sair ANTES do horário - tolerância (Saída Antecipada)
            return diffMinutes < -tolMinutos;
        }

        return false;
    },

    /**
     * Formata um intervalo de tempo em HH:mm (ex: "08:30:00" -> "08:30")
     */
    formatInterval(interval) {
        if (!interval) return "00:00";
        if (typeof interval === 'string') return interval.substring(0, 5);
        return "00:00";
    },

    /**
     * Verifica se uma data específica exige presença física
     */
    isOnSiteDay(escala, date) {
        if (!escala) return true;
        const regime = escala.regime || 'Presencial';
        
        if (regime === 'Presencial') return true;
        if (regime === 'Teletrabalho') return false;
        if (regime === 'Externo') return true; // Externo é considerado "em campo", similar ao presencial para geofencing se aplicável
        
        if (regime === 'Híbrido') {
            const d = new Date(date);
            const dayOfWeek = d.getDay();
            const diasPresenciais = escala.dias_presenciais_json || [];
            return diasPresenciais.includes(dayOfWeek);
        }
        
        return true;
    },

    /**
     * Calcula os minutos de trabalho efetivo por dia considerando o almoço
     */
    calculateDailyWorkMinutes(escala) {
        if (!escala || !escala.horario_entrada || !escala.horario_saida) return 0;
        
        const [h1, m1] = escala.horario_entrada.split(':').map(Number);
        const [h2, m2] = escala.horario_saida.split(':').map(Number);
        
        let diffMinutes = (h2 * 60 + m2) - (h1 * 60 + m1);
        if (diffMinutes < 0) diffMinutes += 1440; 
        
        // Se possui almoço, deduz 1 hora (60 minutos)
        if (escala.possui_almoco !== false) {
            diffMinutes -= 60;
        }
        
        return diffMinutes > 0 ? diffMinutes : 0;
    },

    /**
     * Calcula o horário de término real da jornada considerando extensões de Hora Extra.
     * @param {Object} escala 
     * @param {number} extraMinutes Minutos de HE autorizados (ex: do comunicado [LIMITE:XX])
     */
    getShiftEndWithHE(escala, extraMinutes = 0) {
        if (!escala || !escala.horario_saida) return null;
        const [h, m] = escala.horario_saida.split(':').map(Number);
        const exitTime = new Date();
        exitTime.setHours(h, m + Number(extraMinutes), 0, 0);
        return exitTime;
    },

    /**
     * Verifica se o expediente de um determinado dia já foi encerrado.
     * Útil para não contabilizar ausência em dias futuros ou no mesmo dia antes da hora de saída.
     */
    isDayFinished(dateStr, escala, extraMinutes = 0) {
        const now = new Date();
        // Em vez de ISO (UTC), usamos o fuso local para bater com a data local do browser
        const todayStr = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
        
        if (dateStr < todayStr) return true;
        if (dateStr > todayStr) return false;
        
        // É hoje. Verifica se já passou da hora de saída (considerando HE).
        const exitTime = this.getShiftEndWithHE(escala, extraMinutes);
        if (exitTime) {
            return now >= exitTime;
        }
        
        // Se for hoje mas não tem horário cadastrado, consideramos que não acabou.
        return false;
    },

    /**
     * Verifica se um dia é isento de contagem de faltas (Férias / Folga / Feriado)
     */
    isExemptDay(dateStr, feriados, ferias, escala, plannedDays) {
        if (!dateStr) return false;
        
        // 1. É Férias Aprovada?
        const isVacation = (ferias || []).some(f => f.data_inicio <= dateStr && f.data_fim >= dateStr);
        if (isVacation) return { exempt: true, type: 'FÉRIAS' };

        // 2. É Feriado ou Folga específica?
        const special = (feriados || []).find(f => f.data === dateStr);
        if (special) return { exempt: true, type: special.tipo.toUpperCase().replace('_', ' ') };

        // 3. Não é dia de escala/trabalho?
        const isPlanned = plannedDays.includes(dateStr);
        if (!isPlanned) return { exempt: true, type: 'FOLGA' };

        return { exempt: false };
    },

    /**
     * Formata horas decimais (ex: 8.5) em HH:mm (ex: 08:30)
     */
    formatDecimalHours(decimalHours) {
        if (!decimalHours && decimalHours !== 0) return "00:00";
        const totalMinutes = Math.round(decimalHours * 60);
        const h = Math.floor(Math.abs(totalMinutes) / 60);
        const m = Math.round(Math.abs(totalMinutes) % 60);
        return `${totalMinutes < 0 ? '-' : ''}${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    },

    /**
     * Calcula os detalhes técnicos da janela de ponto para exibição na UI.
     * Única fonte de verdade para Dashboard e Diagnóstico.
     */
    calculateWindowDetails(escala, extraMinutes = 0) {
        if (!escala || !escala.horario_entrada) return null;

        const offsetTime = (timeStr, minutes) => {
            if (!timeStr) return '--:--';
            const [h, m, s] = timeStr.split(':').map(Number);
            const d = new Date();
            d.setHours(h, m, s || 0, 0);
            d.setMinutes(d.getMinutes() + minutes);
            return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        };

        const antesMin = (escala.janela_ativa_antes_minutos !== null && escala.janela_ativa_antes_minutos !== undefined) ? Number(escala.janela_ativa_antes_minutos) : 30;
        const depoisMin = (escala.janela_ativa_depois_minutos !== null && escala.janela_ativa_depois_minutos !== undefined) ? Number(escala.janela_ativa_depois_minutos) : 30;
        const tolMin = (escala.tolerancia_entrada_minutos !== null && escala.tolerancia_entrada_minutos !== undefined) ? Number(escala.tolerancia_entrada_minutos) : 15;

        return {
            entrada: escala.horario_entrada.substring(0, 5),
            saida: escala.horario_saida.substring(0, 5),
            antes: {
                minutos: antesMin,
                horario: offsetTime(escala.horario_entrada, -antesMin)
            },
            depois: {
                minutos: depoisMin,
                horario: offsetTime(escala.horario_saida, depoisMin)
            },
            tolerancia: {
                minutos: tolMin,
                horario: offsetTime(escala.horario_entrada, tolMin)
            },
            prorrogacao: {
                minutos: extraMinutes,
                horario: offsetTime(escala.horario_saida, depoisMin + extraMinutes)
            }
        };
    },

    /**
     * Verifica se um determinado horário (ou o atual) está dentro da janela permitida.
     * Considera janelas de ativação antes/depois e atravessa meia-noite.
     */
    isInActivationWindow(escala, type = 'check-in', extraMinutes = 0, targetDate = new Date()) {
        if (!escala || !escala.horario_entrada) return true;

        const hEntrada = escala.horario_entrada || escala.entrada;
        const hSaida = escala.horario_saida || escala.saida;

        if (!hEntrada || !hSaida) {
            console.warn('[ScalesEngine] Escala sem horários definidos, liberando janela por padrão.');
            return true;
        }

        const [hE, mE] = hEntrada.split(':').map(Number);
        const [hS, mS] = hSaida.split(':').map(Number);

        const janelaAntes = (escala.janela_ativa_antes_minutos !== null && escala.janela_ativa_antes_minutos !== undefined) ? parseInt(escala.janela_ativa_antes_minutos) : 30;
        const janelaDepois = (escala.janela_ativa_depois_minutos !== null && escala.janela_ativa_depois_minutos !== undefined) ? parseInt(escala.janela_ativa_depois_minutos) : 30;
        const tolEntrada = (escala.tolerancia_entrada_minutos !== null && escala.tolerancia_entrada_minutos !== undefined) ? parseInt(escala.tolerancia_entrada_minutos) : 15;

        for (let offset = -1; offset <= 1; offset++) {
            const baseDate = new Date(targetDate);
            baseDate.setDate(baseDate.getDate() + offset);

            const startShift = new Date(baseDate);
            startShift.setHours(hE, mE, 0, 0);

            const endShift = new Date(baseDate);
            endShift.setHours(hS, mS, 0, 0);
            
            // Tratamento de jornada que atravessa a meia-noite
            if (endShift < startShift) endShift.setDate(endShift.getDate() + 1);

            let startWindow, endWindow;

            const safeExtra = Number(extraMinutes || 0);

            if (type === 'check-in') {
                // MODO NUCLEAR: Se for dia de escala, o Check-In é permitido desde 'janelaAntes' até o FIM da jornada.
                // Isso garante que atrasos NUNCA bloqueiem o botão de ponto.
                startWindow = new Date(startShift.getTime() - janelaAntes * 60000);
                endWindow = new Date(endShift.getTime()); 
            } else {
                // Janela de Saída: Do 'horário - janela_depois' até 'horário + janela_depois + HE'
                startWindow = new Date(endShift.getTime() - janelaDepois * 60000);
                endWindow = new Date(endShift.getTime() + (janelaDepois + safeExtra) * 60000);
            }

            // Auditoria de Janela (Dashboard/Diagnóstico)
            if (targetDate >= startWindow && targetDate <= endWindow) {
                console.log(`[ScalesEngine] Sucesso: dentro da janela em offset ${offset} (${type})`);
                return true;
            }
        }

        console.warn(`[ScalesEngine] Bloqueio: fora da janela ativa (${type}) para o horário ${targetDate.toLocaleTimeString()}`);
        return false;
    }
};

export { ScalesEngine };
