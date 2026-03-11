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
        const days = [];
        const startDay = new Date(year, month, 1);
        const endDay = new Date(year, month + 1, 0);
        const startDate = new Date(dataInicio);

        for (let d = new Date(startDay); d <= endDay; d.setDate(d.getDate() + 1)) {
            const dateStr = d.toISOString().split('T')[0];

            if (escala.tipo_escala === 'semanal') {
                // dias_semana: [1,2,3,4,5] (Seg-Sex) - JS: 0=Dom, 1=Seg...
                const dayOfWeek = d.getDay();
                if (escala.dias_semana && escala.dias_semana.includes(dayOfWeek)) {
                    days.push(dateStr);
                }
            }
            else if (escala.tipo_escala === 'ciclo') {
                // ciclo_config: { trabalho_total: 12, folga_total: 48 }
                const trabalho = escala.ciclo_config.trabalho_total || 12;
                const folga = escala.ciclo_config.folga_total || 36;
                const cycleHours = trabalho + folga;

                // Para cada dia, verificamos se existe QUALQUER hora de trabalho dentro dele
                // Consideramos o dia d das 00:00 às 23:59
                const dayStart = new Date(d);
                dayStart.setHours(0, 0, 0, 0);
                const dayEnd = new Date(d);
                dayEnd.setHours(23, 59, 59, 999);

                const msSinceStart = dayStart.getTime() - startDate.getTime();
                const hoursSinceStart = msSinceStart / (1000 * 60 * 60);

                if (hoursSinceStart >= -24) { // Permitir checar se o plantão começou no dia anterior
                    // Verificação simplificada: um dia é de "trabalho" se o início do dia 
                    // cai dentro de um período de trabalho do ciclo
                    const positionInCycle = (hoursSinceStart >= 0)
                        ? (hoursSinceStart % cycleHours)
                        : (cycleHours + (hoursSinceStart % cycleHours)) % cycleHours;

                    if (positionInCycle < trabalho) {
                        days.push(dateStr);
                    }
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
     * Formata horas decimais para HH:mm
     */
    formatDecimalHours(decimal) {
        const hours = Math.floor(decimal);
        const minutes = Math.round((decimal - hours) * 60);
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    }
};

export { ScalesEngine };
