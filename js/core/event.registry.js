import { JustificativasHistory } from '../modules/justificativas/justificativas.history.js';
import { ResultadoFeedbackHistory } from '../modules/justificativas/resultadofeedback.history.js';
import { JustificativasCounter } from '../modules/justificativas/justificativas.counter.js';
import { AtividadesHistory } from '../modules/atividades/atividades.history.js';
import { FeriasHistory } from '../modules/ferias/ferias.history.js';
import { FeriasCounter } from '../modules/ferias/ferias.counter.js';
import { ComunicadoHistory } from '../modules/comunicado/comunicado.history.js';
import { ComunicadoCounter } from '../modules/comunicado/comunicado.counter.js';
import { HoraExtraHistory } from '../modules/hora_extra/horaextra.history.js';
import { FeriadosHistory } from '../modules/feriados/feriados.history.js';
import { FeriadosCounter } from '../modules/feriados/feriados.counter.js';
import { AlertarFeriadosBadge } from '../modules/Alertar_feriados_folgas/alertar.feriados.badge.js';
import { AlertarFeriadosCard } from '../modules/Alertar_feriados_folgas/alertar.feriados.card.js';

/**
 * EventRegistry - ChronoSync Core
 * Registro central de provedores de lógica para cada tipo de evento.
 */
export const EventRegistry = {
    modules: {},

    /**
     * Registra um novo módulo de evento
     * @param {string} type Tipo do evento (ex: 'mensagem', 'hora_extra', 'ferias_folgas')
     * @param {object} provider Objeto contendo { counter, history }
     */
    register(type, provider) {
        if (!this.modules[type]) {
            this.modules[type] = provider;
        } else {
            // Faze o merge para evitar que o renderizador apague o contador (ou vice-versa)
            this.modules[type] = { ...this.modules[type], ...provider };
        }
        console.log(`[EventRegistry] Módulo '${type}' registrado/atualizado.`);
    },

    /**
     * Obtém o provedor para um tipo específico
     */
    getProvider(type) {
        if (!type) return null;
        const typeKey = type.toString().toLowerCase();

        // Mapeamentos resilientes (ChronoSync Core)
        if (typeKey === 'mensagem' || typeKey === 'comunicado') return this.modules['mensagem'];
        if (typeKey === 'hora_extra') return this.modules['hora_extra'];
        if (typeKey.includes('ferias_folga')) return this.modules['ferias_folgas'];
        if (typeKey === 'atividade') return this.modules['atividade'];
        if (typeKey === 'justificativa') return this.modules['justificativa'];
        if (typeKey.includes('ferias')) return this.modules['ferias'];
        if (typeKey === 'alerta_feriados_folgas') return this.modules['alerta_feriados_folgas'];
        
        return this.modules[typeKey] || this.modules[type];
    },

    /**
     * Lista todos os tipos registrados
     */
    getAllTypes() {
        return Object.keys(this.modules);
    }
};

// Registro Automático de Provedores Modulares (ChronoSync Core)
EventRegistry.register('justificativa', { history: JustificativasHistory, counter: JustificativasCounter });
EventRegistry.register('atividade', { history: AtividadesHistory });
EventRegistry.register('ferias', { history: FeriasHistory, counter: FeriasCounter });
EventRegistry.register('cronograma_ferias', { history: FeriasHistory, counter: FeriasCounter });
EventRegistry.register('mensagem', { history: ComunicadoHistory, counter: ComunicadoCounter });
EventRegistry.register('hora_extra', { history: HoraExtraHistory, counter: ComunicadoCounter });
EventRegistry.register('ferias_folgas', { history: FeriadosHistory, counter: FeriadosCounter });
EventRegistry.register('alerta_feriados_folgas', { history: { render: (item) => AlertarFeriadosCard.render(item) }, counter: AlertarFeriadosBadge });
EventRegistry.register('justificativa_resultado', { history: ResultadoFeedbackHistory });
