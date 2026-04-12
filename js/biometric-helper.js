import { supabase } from './supabase-config.js';

const TEMPLATE_VERSION = 'face-descriptor-v1';
const DESCRIPTOR_LENGTH = 128;

function isFiniteNumber(value) {
    return typeof value === 'number' && Number.isFinite(value);
}

function normalizeDescriptor(descriptor) {
    if (!Array.isArray(descriptor) || descriptor.length !== DESCRIPTOR_LENGTH) return null;
    if (!descriptor.every(isFiniteNumber)) return null;
    return descriptor.map(Number);
}

export const BiometricHelper = {
    templateVersion: TEMPLATE_VERSION,
    descriptorLength: DESCRIPTOR_LENGTH,

    serializeTemplate(descriptor) {
        const normalized = normalizeDescriptor(descriptor);
        if (!normalized) {
            throw new Error('Template biométrico inválido.');
        }

        return JSON.stringify({
            version: TEMPLATE_VERSION,
            descriptor: normalized,
            created_at: new Date().toISOString()
        });
    },

    parseTemplate(rawTemplate) {
        if (!rawTemplate || typeof rawTemplate !== 'string') {
            return { valid: false, reason: 'empty', descriptor: null, format: null };
        }

        try {
            const parsed = JSON.parse(rawTemplate);

            if (Array.isArray(parsed)) {
                const legacyDescriptor = normalizeDescriptor(parsed);
                if (!legacyDescriptor) {
                    return { valid: false, reason: 'legacy-invalid', descriptor: null, format: 'legacy-array' };
                }

                return { valid: true, reason: null, descriptor: legacyDescriptor, format: 'legacy-array' };
            }

            if (parsed && parsed.version === TEMPLATE_VERSION) {
                const normalized = normalizeDescriptor(parsed.descriptor);
                if (!normalized) {
                    return { valid: false, reason: 'descriptor-invalid', descriptor: null, format: TEMPLATE_VERSION };
                }

                return { valid: true, reason: null, descriptor: normalized, format: TEMPLATE_VERSION };
            }

            return { valid: false, reason: 'unsupported-format', descriptor: null, format: parsed?.version || 'unknown' };
        } catch (error) {
            return { valid: false, reason: 'non-json-token', descriptor: null, format: 'raw-string' };
        }
    },

    isTemplateValid(rawTemplate) {
        return this.parseTemplate(rawTemplate).valid;
    },

    async fetchTemplateForUser(funcionarioId) {
        const { data, error } = await supabase
            .from('funcionarios')
            .select('id, biometria_cadastrada, biometria_token')
            .eq('id', funcionarioId)
            .single();

        if (error) throw error;

        const parsedTemplate = this.parseTemplate(data?.biometria_token || '');
        return {
            user: data,
            parsedTemplate
        };
    },

    buildAudit({
        score = null,
        method = 'face-api',
        deviceError = null,
        threshold = null,
        sampleCount = null,
        tokenFormat = null
    } = {}) {
        return {
            biometria_verificada: deviceError ? false : true,
            biometria_score: isFiniteNumber(score) ? Number(score.toFixed(4)) : null,
            biometria_metodo: method,
            biometria_timestamp: new Date().toISOString(),
            biometria_device_error: deviceError || null,
            biometria_threshold: isFiniteNumber(threshold) ? Number(threshold.toFixed(4)) : null,
            biometria_amostras: Number.isInteger(sampleCount) ? sampleCount : null,
            biometria_token_formato: tokenFormat || null
        };
    },

    getCameraErrorMessage(error) {
        switch (error?.name) {
            case 'NotAllowedError':
            case 'PermissionDeniedError':
                return 'Permissão da câmera negada. Libere o acesso à câmera frontal no navegador para continuar.';
            case 'NotFoundError':
            case 'DevicesNotFoundError':
                return 'Nenhuma câmera compatível foi encontrada neste dispositivo.';
            case 'NotReadableError':
            case 'TrackStartError':
                return 'A câmera está ocupada por outro aplicativo ou indisponível no momento.';
            case 'OverconstrainedError':
            case 'ConstraintNotSatisfiedError':
                return 'Não foi possível abrir a câmera frontal com os parâmetros necessários.';
            default:
                return 'Falha ao acessar a câmera frontal. Revise permissões e tente novamente.';
        }
    }
};

window.BiometricHelper = BiometricHelper;
