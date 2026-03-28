import { ScalesEngine } from './scales-engine.js';

/**
 * EventManager - ChronoSync
 * Única fonte de verdade para regras de negócio, títulos e ícones de eventos.
 */
export const EventManager = {
    // 1. Configuração Visual de Eventos
    EVENT_CONFIG: {
        'ATIVIDADE': {
            title: 'ATIVIDADE REGISTRADA',
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
            autoClear: true
        },
        'FERIAS': {
            title: 'FÉRIAS PROGRAMADAS',
            icon: 'beach_access',
            colorClass: 'text-sky-400',
            premiumBorder: 'premium-border-sky',
            autoClear: true
        },
        'COMUNICADO': {
            title: 'COMUNICADO OFICIAL',
            icon: 'campaign',
            colorClass: 'text-emerald-500',
            premiumBorder: 'premium-border-green',
            autoClear: true
        },
        'HORA_EXTRA': {
            title: 'SOLICITAÇÃO DE HORA EXTRA',
            icon: 'campaign',
            colorClass: 'text-amber-500',
            premiumBorder: 'premium-border-amber',
            autoClear: false // Requer CIENTE
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
        if (typeKey === 'FERIAS') return this.EVENT_CONFIG['FERIAS'];
        if (typeKey === 'FERIAS_FOLGA') return this.EVENT_CONFIG['FERIAS_FOLGA'];
        
        return this.EVENT_CONFIG[typeKey] || this.EVENT_CONFIG['SISTEMA'];
    },

    // 3. Regras de Edição (24 Horas)
    canEdit(item) {
        const createdAt = new Date(item.created_at || item.data_hora || item.time || item.time_raw);
        const now = new Date();
        const diffHours = (now - createdAt) / (1000 * 60 * 60);

        const editableTypes = ['ATIVIDADE', 'JUSTIFICATIVA'];
        const isEditableType = editableTypes.includes(item.itemType || item.type);
        const isPending = (item.status === 'pendente' || item.status_pendencia === 'pendente');

        return diffHours < 24 && isEditableType && (item.itemType === 'ATIVIDADE' || isPending);
    },

    // 4. Inteligência de Escala (Integração com ScalesEngine)
    validatePointEvent(ponto, escala) {
        if (!escala) return { status: 'normal', msg: '' };

        const results = [];
        
        // A. Geofence
        if (escala.lat && escala.lng && ponto.geolocalizacao_json) {
            const dist = ScalesEngine.calculateDistance(
                ponto.geolocalizacao_json.lat, 
                ponto.geolocalizacao_json.lng,
                escala.lat,
                escala.lng
            );
            if (dist > (escala.raio_geofence || 200)) {
                results.push('FORA DO RAIO');
            }
        }

        // B. Tolerância de Horário
        const scheduledTime = ponto.tipo === 'check-in' ? escala.horario_entrada : escala.horario_saida;
        if (scheduledTime && !ScalesEngine.isWithinTimeWindow(scheduledTime, escala.tolerancia_minutos || 15)) {
            results.push('HORÁRIO DIVERGENTE');
        }

        return {
            status: results.length > 0 ? 'divergente' : 'normal',
            alerts: results
        };
    },

    // 5. Limpeza de Diário (Nova Regra: Exceto Hora Extra)
    async clearAutoInformativos(userId, allItems) {
        const toClear = allItems.filter(item => {
            const config = this.getConfig(item);
            const alreadySeen = localStorage.getItem(`visto_${item.id}`) || localStorage.getItem(`ciente_${item.id}`) || localStorage.getItem(`visto_feriado_${item.id}`);
            return config.autoClear && !alreadySeen;
        });

        toClear.forEach(item => {
            const config = this.getConfig(item);
            // Salva no localStorage para não contar mais no badge
            if (item.itemType === 'FERIAS_FOLGA') {
                localStorage.setItem(`visto_feriado_${item.id}`, 'true');
            } else if (item.itemType === 'COMUNICADO') {
                localStorage.setItem(`ciente_${item.id}`, 'true');
            } else {
                localStorage.setItem(`visto_${item.id}`, 'true');
            }
        });

        return toClear.length;
    }
};
