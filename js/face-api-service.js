export const FaceApiService = {
    isLoaded: false,
    defaultThreshold: 0.55,
    minDetectionScore: 0.35,

    async init() {
        if (this.isLoaded) return;

        return new Promise((resolve, reject) => {
            if (window.faceapi) {
                this.loadModels().then(resolve).catch(reject);
                return;
            }

            console.log('[FaceApi] Carregando biblioteca via CDN...');
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/dist/face-api.min.js';

            script.onload = async () => {
                try {
                    await this.loadModels();
                    resolve();
                } catch (error) {
                    reject(error);
                }
            };
            script.onerror = () => reject(new Error('Falha ao carregar face-api.js'));
            document.head.appendChild(script);
        });
    },

    async loadModels() {
        const MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models';
        console.log('[FaceApi] Baixando modelos neurais...');

        await Promise.all([
            faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
            faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
            faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
        ]);

        this.isLoaded = true;
        console.log('[FaceApi] Modelos neurais carregados com sucesso.');
    },

    getDetectorOptions(inputSize = 320, scoreThreshold = this.minDetectionScore) {
        return new faceapi.TinyFaceDetectorOptions({ inputSize, scoreThreshold });
    },

    async detectAllFaces(mediaElement, { minScore = this.minDetectionScore } = {}) {
        if (!this.isLoaded) await this.init();

        const detections = await faceapi
            .detectAllFaces(mediaElement, this.getDetectorOptions(320, minScore))
            .withFaceLandmarks()
            .withFaceDescriptors();

        return detections || [];
    },

    async getSingleFaceData(mediaElement, { minScore = this.minDetectionScore, requireSingleFace = true } = {}) {
        const detections = await this.detectAllFaces(mediaElement, { minScore });

        if (!detections.length) {
            throw new Error('Nenhuma face clara detectada. Posicione o rosto mais perto e assegure boa iluminação.');
        }

        if (requireSingleFace && detections.length !== 1) {
            throw new Error('A captura precisa conter apenas uma face visível.');
        }

        const bestDetection = [...detections].sort((a, b) => (b.detection?.score || 0) - (a.detection?.score || 0))[0];
        if (!bestDetection || (bestDetection.detection?.score || 0) < minScore) {
            throw new Error('A qualidade da captura facial ficou abaixo do mínimo necessário.');
        }

        return {
            descriptor: Array.from(bestDetection.descriptor),
            detectionScore: Number((bestDetection.detection?.score || 0).toFixed(4)),
            faceCount: detections.length,
            box: bestDetection.detection?.box || null
        };
    },

    async getFaceDescriptor(mediaElement, options = {}) {
        const faceData = await this.getSingleFaceData(mediaElement, options);
        return faceData.descriptor;
    },

    compareFaces(descriptor1, descriptor2, threshold = this.defaultThreshold) {
        if (!descriptor1 || !descriptor2) {
            return {
                isMatch: false,
                distance: null,
                confidenceScore: null,
                threshold
            };
        }

        const d1 = new Float32Array(descriptor1);
        const d2 = new Float32Array(descriptor2);
        const distance = faceapi.euclideanDistance(d1, d2);
        const confidenceScore = Math.max(0, 1 - distance);

        console.log(`[FaceApi] Distância euclidiana calculada: ${distance.toFixed(4)} (Threshold: ${threshold})`);

        return {
            isMatch: distance < threshold,
            distance: Number(distance.toFixed(4)),
            confidenceScore: Number(confidenceScore.toFixed(4)),
            threshold
        };
    },

    async verifyLiveMatch(videoElement, savedDescriptor, {
        samples = 3,
        threshold = 0.60, // Aumentado levemente para evitar rejeições por sombra/luz
        minScore = 0.4,
        maxRetries = 10  // Aumentado o número de tentativas
    } = {}) {
        if (!Array.isArray(savedDescriptor) || !savedDescriptor.length) {
            throw new Error('Template biométrico ausente para comparação.');
        }

        const matches = [];
        let attempts = 0;

        while (matches.length < samples && attempts < maxRetries) {
            attempts += 1;
            try {
                const faceData = await this.getSingleFaceData(videoElement, { minScore, requireSingleFace: true });
                const comparison = this.compareFaces(savedDescriptor, faceData.descriptor, threshold);

                matches.push({
                    ...comparison,
                    detectionScore: faceData.detectionScore
                });

                console.log(`[FaceApi] Amostra ${matches.length}/${samples} capturada com sucesso.`);
            } catch (e) {
                console.warn(`[FaceApi] Tentativa ${attempts}/${maxRetries} falhou: ${e.message}`);
                if (attempts >= maxRetries) throw e;
                // Espera um pouco mais antes da próxima tentativa para a câmera focar
                await new Promise(resolve => setTimeout(resolve, 300));
            }
        }

        if (matches.length < samples) {
            throw new Error('Não foi possível obter amostras faciais estáveis. Tente novamente com o rosto centralizado.');
        }

        const allMatched = matches.every(item => item.isMatch);
        const avgConfidence = matches.reduce((acc, item) => acc + (item.confidenceScore || 0), 0) / matches.length;
        const avgDistance = matches.reduce((acc, item) => acc + (item.distance || 0), 0) / matches.length;
        const avgDetection = matches.reduce((acc, item) => acc + (item.detectionScore || 0), 0) / matches.length;

        return {
            isMatch: allMatched,
            sampleCount: matches.length,
            threshold,
            averageConfidence: Number(avgConfidence.toFixed(4)),
            averageDistance: Number(avgDistance.toFixed(4)),
            averageDetectionScore: Number(avgDetection.toFixed(4)),
            samples: matches
        };
    }
};
