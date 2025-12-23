// recorder.js - Enregistrement audio en direct
console.log('✅ recorder.js loaded');

/**
 * Classe pour gérer l'enregistrement audio
 */
class AudioRecorder {
    constructor() {
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.stream = null;
        this.startTime = null;
        this.timerInterval = null;
        this.isRecording = false;
    }

    /**
     * Demander la permission du microphone et initialiser
     */
    async initialize() {
        try {
            console.log('🎤 Requesting microphone access...');
            
            // Demander l'accès au microphone
            this.stream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    sampleRate: 44100
                } 
            });
            
            console.log('✅ Microphone access granted');
            
            // Créer le MediaRecorder
            const options = { mimeType: 'audio/webm' };
            
            // Vérifier le support du codec
            if (!MediaRecorder.isTypeSupported(options.mimeType)) {
                options.mimeType = 'audio/ogg';
                if (!MediaRecorder.isTypeSupported(options.mimeType)) {
                    options.mimeType = 'audio/mp4';
                }
            }
            
            this.mediaRecorder = new MediaRecorder(this.stream, options);
            
            // Event: Données disponibles
            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.audioChunks.push(event.data);
                }
            };
            
            // Event: Enregistrement arrêté
            this.mediaRecorder.onstop = () => {
                console.log('✅ Recording stopped');
            };
            
            return { success: true };
            
        } catch (error) {
            console.error('❌ Error accessing microphone:', error);
            
            if (error.name === 'NotAllowedError') {
                return { 
                    success: false, 
                    error: 'Accès au microphone refusé. Veuillez autoriser l\'accès dans les paramètres du navigateur.' 
                };
            }
            
            return { 
                success: false, 
                error: 'Impossible d\'accéder au microphone : ' + error.message 
            };
        }
    }

    /**
     * Démarrer l'enregistrement
     */
    start() {
        if (!this.mediaRecorder) {
            console.error('❌ MediaRecorder not initialized');
            return { success: false, error: 'Enregistreur non initialisé' };
        }
        
        try {
            // Réinitialiser
            this.audioChunks = [];
            this.startTime = Date.now();
            this.isRecording = true;
            
            // Démarrer l'enregistrement
            this.mediaRecorder.start(1000); // Chunk toutes les 1 seconde
            
            console.log('🎙️ Recording started');
            
            // Démarrer le timer
            this.startTimer();
            
            return { success: true };
            
        } catch (error) {
            console.error('❌ Error starting recording:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Arrêter l'enregistrement
     */
    async stop() {
        if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
            return { success: false, error: 'Aucun enregistrement en cours' };
        }
        
        return new Promise((resolve) => {
            this.mediaRecorder.onstop = async () => {
                this.isRecording = false;
                this.stopTimer();
                
                // Créer le blob audio
                const audioBlob = new Blob(this.audioChunks, { 
                    type: this.mediaRecorder.mimeType 
                });
                
                const duration = Math.floor((Date.now() - this.startTime) / 1000);
                
                console.log('✅ Recording stopped:', {
                    size: (audioBlob.size / 1024).toFixed(2) + ' KB',
                    duration: duration + 's',
                    type: audioBlob.type
                });
                
                resolve({ 
                    success: true, 
                    audioBlob, 
                    duration,
                    mimeType: this.mediaRecorder.mimeType
                });
            };
            
            this.mediaRecorder.stop();
        });
    }

    /**
     * Annuler l'enregistrement
     */
    cancel() {
        if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
            this.mediaRecorder.stop();
        }
        
        this.audioChunks = [];
        this.isRecording = false;
        this.stopTimer();
        this.cleanup();
        
        console.log('🗑️ Recording cancelled');
    }

    /**
     * Démarrer le timer
     */
    startTimer() {
        const timerDisplay = document.getElementById('recordingTimer');
        if (!timerDisplay) return;
        
        this.timerInterval = setInterval(() => {
            const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
            const minutes = Math.floor(elapsed / 60).toString().padStart(2, '0');
            const seconds = (elapsed % 60).toString().padStart(2, '0');
            timerDisplay.textContent = `${minutes}:${seconds}`;
        }, 1000);
    }

    /**
     * Arrêter le timer
     */
    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    /**
     * Nettoyer les ressources
     */
    cleanup() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
        
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.startTime = null;
        this.isRecording = false;
    }

    /**
     * Obtenir le niveau audio (pour visualisation)
     */
    getAudioLevel() {
        // TODO: Implémenter l'analyse du niveau audio avec AudioContext
        return Math.random() * 100; // Temporaire
    }
}

// Exporter la classe
window.AudioRecorder = AudioRecorder;

console.log('✅ recorder.js fully loaded');