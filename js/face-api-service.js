import { UI } from './ui-utils.js';

export const FaceApiService = {
    isLoaded: false,
    
    async init() {
        if (this.isLoaded) return;
        
        return new Promise((resolve, reject) => {
            if (window.faceapi) {
                this.loadModels().then(resolve).catch(reject);
                return;
            }
            
            console.log('[FaceApi] Carregando biblioteca via CDN...');
            const script = document.createElement('script');
            // Usando build otimizada da branch atualizada do vladmandic (mais rápida)
            script.src = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api/dist/face-api.min.js";
            
            script.onload = async () => {
                await this.loadModels();
                resolve();
            };
            script.onerror = () => reject(new Error('Falha ao carregar face-api.js'));
            document.head.appendChild(script);
        });
    },

    async loadModels() {
        // Modelos leve para ser rápido no mobile (Tiny + Landmarks 68 + Recognition)
        const MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models';
        console.log('[FaceApi] Baixando modelos neurais...');
        
        try {
            await Promise.all([
                faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
                faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
                faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
            ]);
            this.isLoaded = true;
            console.log('[FaceApi] Modelos neurais carregados com sucesso.');
        } catch (error) {
            console.error('[FaceApi] Erro ao carregar modelos:', error);
            throw error;
        }
    },

    async getFaceDescriptor(mediaElement) {
        if (!this.isLoaded) await this.init();
        
        console.log('[FaceApi] Analisando face...');
        const detection = await faceapi.detectSingleFace(mediaElement, new faceapi.TinyFaceDetectorOptions())
                                       .withFaceLandmarks()
                                       .withFaceDescriptor();
                                       
        if (!detection) return null;
        
        // Converte Float32Array para Array normal (fácil de salvar no JSON do banco)
        return Array.from(detection.descriptor); 
    },

    compareFaces(descriptor1, descriptor2, threshold = 0.55) {
        if (!descriptor1 || !descriptor2) return false;
        
        const d1 = new Float32Array(descriptor1);
        const d2 = new Float32Array(descriptor2);
        
        const distance = faceapi.euclideanDistance(d1, d2);
        console.log(`[FaceApi] Distância euclidiana calculada: ${distance.toFixed(4)} (Threshold: ${threshold})`);
        
        // Retorna true se a distância for MENOR que o threshold (Ou seja, são a mesma pessoa com um grau de confiança aceitável)
        return distance < threshold; 
    }
};
