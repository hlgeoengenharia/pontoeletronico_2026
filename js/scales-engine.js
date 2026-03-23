/**
 * Scales Engine - ChronoSync
 * Lógica de Projeção e Cálculos de Escalas Híbridas
 */

const ScalesEngine = {
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
     * Verifica se o horário atual está dentro da janela de tolerância
     * @param {string} scheduledTime "HH:mm:ss" ou "HH:mm"
     * @param {number} tolMinutos Minutos de tolerância
     */
    isWithinTimeWindow(scheduledTime, tolMinutos) {
        if (!scheduledTime) return true;

        const now = new Date();
        const [h, m] = scheduledTime.split(':').map(Number);

        const scheduled = new Date();
        scheduled.setHours(h, m, 0, 0);

        const diffMinutes = Math.abs(now - scheduled) / (1000 * 60);
        return diffMinutes <= tolMinutos;
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
     * Verifica se o expediente de um determinado dia já foi encerrado.
     * Útil para não contabilizar ausência em dias futuros ou no mesmo dia antes da hora de saída.
     */
    isDayFinished(dateStr, escala) {
        const now = new Date();
        // Em vez de ISO (UTC), usamos o fuso local para bater com a data local do browser
        const todayStr = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
        
        if (dateStr < todayStr) return true;
        if (dateStr > todayStr) return false;
        
        // É hoje. Verifica se já passou da hora de saída.
        if (escala && escala.horario_saida) {
            const [h, m] = escala.horario_saida.split(':').map(Number);
            const exitTime = new Date();
            exitTime.setHours(h, m, 0, 0);
            return now >= exitTime;
        }
        
        // Se for hoje mas não tem horário cadastrado, consideramos que não acabou.
        return false;
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
    }
};

export { ScalesEngine };
