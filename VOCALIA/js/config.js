// Configuration globale de l'application
const CONFIG = {
    N8N_WEBHOOK_URL: 'https://andreaprogra.app.n8n.cloud/webhook/88303112-848e-4b93-8758-5c2b16ecc52e',
    N8N_TRANSLATE_WEBHOOK_URL: 'https://andreaprogra.app.n8n.cloud/webhook/translate-report',
    APP_VERSION: '1.0.0',
    MAX_FILE_SIZE: 50 * 1024 * 1024, // 50MB
    SUPPORTED_AUDIO_FORMATS: [
        'audio/mp3',
        'audio/mp4',
        'audio/mpeg',
        'audio/wav',
        'audio/webm',
        'audio/ogg',
        'audio/m4a'
    ],
    RECORDER_OPTIONS: {
        audio: {
            echoCancellation: true,
            noiseSuppression: true,
            sampleRate: 44100
        }
    },
    PREFERRED_FORMATS: [
        'audio/mp4',
        'audio/mp4;codecs=mp4a.40.2',
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg;codecs=opus'
    ]
};

// Pages disponibles
const PAGES = {
    LOGIN: 'loginPage',
    BROUILLON: 'brouillonPage',
    RAPPORTS: 'rapportsPage',
    PROFIL: 'profilPage'  // NOUVEAU
};