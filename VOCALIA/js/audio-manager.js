// Gestionnaire audio pour l'enregistrement et le traitement des fichiers
class AudioManager {
    constructor() {
        this.isRecording = false;
        this.audioRecorder = null;
        this.audioStream = null;
        this.recordedBlob = null;
        this.audioChunks = [];
        this.uploadedFile = null;
        this.currentAudio = null; // ✅ AJOUT : Stocker l'instance audio en cours de lecture
        
        this.initializeElements();
        this.bindEvents();
    }

    initializeElements() {
        this.recordBtn = document.getElementById('recordBtn');
        this.playBtn = document.getElementById('playBtn');
        this.reRecordBtn = document.getElementById('reRecordBtn');
        this.uploadBtn = document.getElementById('uploadBtn');
        this.audioFileInput = document.getElementById('audioFileInput');
        this.sendAudioBtn = document.getElementById('sendAudioBtn');
        this.recordingStatus = document.getElementById('recordingStatus');
        this.uploadStatus = document.getElementById('uploadStatus');
        this.audioControls = document.getElementById('audioControls');
    }

    bindEvents() {
        // ✅ BOUTON ENREGISTREMENT - Support desktop (click) + mobile (touchstart)
        if (this.recordBtn) {
            this.recordBtn.addEventListener('click', () => this.toggleRecording());
            // Support tactile mobile
            this.recordBtn.addEventListener('touchstart', (e) => {
                e.preventDefault(); // Empêche le click 300ms après
                this.toggleRecording();
            }, { passive: false });
        }

        // ✅ BOUTON LECTURE - Support desktop + mobile
        if (this.playBtn) {
            this.playBtn.addEventListener('click', () => this.playRecording());
            this.playBtn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.playRecording();
            }, { passive: false });
        }

        // ✅ BOUTON REFAIRE - Support desktop + mobile
        if (this.reRecordBtn) {
            this.reRecordBtn.addEventListener('click', () => this.resetRecording());
            this.reRecordBtn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.resetRecording();
            }, { passive: false });
        }

        // ✅ BOUTON UPLOAD - Support desktop + mobile
        if (this.uploadBtn) {
            this.uploadBtn.addEventListener('click', () => this.audioFileInput.click());
            // Mobile : on laisse le click se propager naturellement
            this.uploadBtn.addEventListener('touchend', (e) => {
                // touchend au lieu de touchstart pour éviter les conflits
                // Pas de preventDefault ici pour permettre le click natif
                this.audioFileInput.click();
            }, { passive: true });
        }

        // ✅ INPUT FICHIER - Fonctionne identique desktop/mobile
        if (this.audioFileInput) {
            this.audioFileInput.addEventListener('change', (e) => this.handleFileUpload(e));
        }

        // ✅ BOUTON ENVOYER - Support desktop + mobile
        if (this.sendAudioBtn) {
            this.sendAudioBtn.addEventListener('click', () => this.sendAudio());
            this.sendAudioBtn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.sendAudio();
            }, { passive: false });
        }
    }

    // === ENREGISTREMENT AUDIO ===

    async toggleRecording() {
        if (this.isRecording) {
            this.stopRecording();
        } else {
            await this.startRecording();
        }
    }

    async startRecording() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia(CONFIG.RECORDER_OPTIONS);
            this.audioStream = stream;

            // Détection automatique du meilleur format supporté
            let options = {};
            let selectedFormat = null;
            
            for (const format of CONFIG.PREFERRED_FORMATS) {
                if (MediaRecorder.isTypeSupported(format)) {
                    selectedFormat = format;
                    options = { mimeType: format };
                    break;
                }
            }
            
            console.log('Format audio sélectionné:', selectedFormat || 'Défaut du navigateur');
            
            this.audioRecorder = new MediaRecorder(stream, options);
            this.audioChunks = [];

            this.audioRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.audioChunks.push(event.data);
                }
            };

            this.audioRecorder.onstop = () => {
                const blobType = selectedFormat || 'audio/wav';
                this.recordedBlob = new Blob(this.audioChunks, { type: blobType });
                console.log('Blob créé:', this.recordedBlob.size, 'bytes, type:', blobType);
                
                // Reset du fichier uploadé si on enregistre
                this.uploadedFile = null;
                this.updateUploadStatus('');
                this.uploadBtn.classList.remove('active');
                
                this.updateRecordingUI(false);
                this.stopAudioStream();
            };

            this.audioRecorder.start();
            this.isRecording = true;
            this.updateRecordingUI(true);
            
            console.log('Enregistrement démarré avec succès');

        } catch (error) {
            console.error('Erreur microphone:', error);
            
            // Messages d'erreur traduits
            let errorKey = 'toast.audio.error.mic';
            if (error.name === 'NotAllowedError') {
                errorKey = 'toast.audio.error.mic.denied';
            } else if (error.name === 'NotFoundError') {
                errorKey = 'toast.audio.error.mic.notfound';
            } else if (error.name === 'NotSupportedError') {
                errorKey = 'toast.audio.error.mic.notsupported';
            }
            
            Utils.showToast(t(errorKey), 'error');
        }
    }

    stopRecording() {
        if (this.audioRecorder && this.isRecording) {
            this.audioRecorder.stop();
            this.isRecording = false;
        }
    }

    stopAudioStream() {
        if (this.audioStream) {
            this.audioStream.getTracks().forEach(track => track.stop());
            this.audioStream = null;
        }
    }

    // ✅ CORRECTION : Gestion de l'instance audio pour éviter les doubles lectures
    playRecording() {
        // ✅ ÉTAPE 1 : Arrêter l'audio précédent s'il existe
        if (this.currentAudio) {
            console.log('⏹️ Arrêt de l\'audio en cours');
            this.currentAudio.pause();
            this.currentAudio.currentTime = 0;
            this.currentAudio = null;
        }

        const audioToPlay = this.uploadedFile || this.recordedBlob;
        
        if (audioToPlay) {
            const audioUrl = URL.createObjectURL(audioToPlay);
            this.currentAudio = new Audio(audioUrl); // ✅ ÉTAPE 2 : Stocker la nouvelle instance
            
            console.log('▶️ Lecture audio démarrée');
            
            this.currentAudio.play().catch(error => {
                console.error('Erreur lecture audio:', error);
                Utils.showToast(t('toast.audio.error.mic'), 'error');
                this.currentAudio = null;
            });
            
            // ✅ ÉTAPE 3 : Nettoyer après la fin de la lecture
            this.currentAudio.addEventListener('ended', () => {
                console.log('✅ Lecture audio terminée');
                URL.revokeObjectURL(audioUrl);
                this.currentAudio = null;
            });

            // ✅ ÉTAPE 4 : Nettoyer en cas d'erreur
            this.currentAudio.addEventListener('error', (e) => {
                console.error('❌ Erreur audio:', e);
                URL.revokeObjectURL(audioUrl);
                this.currentAudio = null;
            });
        }
    }

    // ✅ CORRECTION : Arrêter l'audio lors de l'annulation
    resetRecording() {
        console.log('🔄 Reset de l\'enregistrement');
        
        // ✅ ÉTAPE 1 : Arrêter l'audio en cours de lecture
        if (this.currentAudio) {
            console.log('⏹️ Arrêt de l\'audio en cours lors du reset');
            this.currentAudio.pause();
            this.currentAudio.currentTime = 0;
            this.currentAudio = null;
        }

        // ✅ ÉTAPE 2 : Nettoyer les données d'enregistrement
        this.recordedBlob = null;
        this.uploadedFile = null;
        this.isRecording = false;
        this.stopAudioStream();
        
        // Reset UI
        this.updateRecordingUI(false);
        this.updateUploadStatus('');
        this.uploadBtn.classList.remove('active');
        
        if (this.audioFileInput) {
            this.audioFileInput.value = '';
        }
        
        if (this.recordingStatus) {
            this.recordingStatus.textContent = t('drafts.record.button');
        }
        
        if (this.audioControls) {
            this.audioControls.classList.remove('show');
        }
        
        if (this.sendAudioBtn) {
            this.sendAudioBtn.classList.remove('show');
        }
        
        console.log('✅ Reset terminé');
    }

    // === UPLOAD DE FICHIERS ===

    handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        // Validation du type de fichier
        if (!Utils.isValidAudioFile(file)) {
            Utils.showToast(t('toast.audio.error.format'), 'error');
            event.target.value = '';
            return;
        }

        // Validation de la taille
        if (!Utils.isValidFileSize(file)) {
            const maxSize = Utils.formatFileSize(CONFIG.MAX_FILE_SIZE);
            Utils.showToast(t('toast.audio.error.size', { size: maxSize }), 'error');
            event.target.value = '';
            return;
        }

        // Fichier valide
        this.uploadedFile = file;
        
        // Reset de l'enregistrement si on upload
        this.recordedBlob = null;
        this.resetRecordingUI();
        
        // Mise à jour de l'interface avec traduction
        const successMsg = t('drafts.upload.success', { 
            filename: file.name, 
            size: Utils.formatFileSize(file.size) 
        });
        this.updateUploadStatus(successMsg);
        this.uploadBtn.classList.add('active');
        
        // Affichage des contrôles
        if (this.audioControls) {
            this.audioControls.classList.add('show');
        }
        
        if (this.sendAudioBtn) {
            this.sendAudioBtn.classList.add('show');
        }

        Utils.showToast(t('toast.audio.loaded'), 'success');
        
        event.target.value = '';
    }

    // === ENVOI AUDIO ===

    async sendAudio() {
        const audioSource = this.uploadedFile || this.recordedBlob;
        
        if (!audioSource) {
            Utils.showToast(t('toast.audio.none'), 'error');
            return;
        }

        // ============================================
        // 🚀 NOUVELLE VÉRIFICATION : LIMITE FREE
        // ============================================
        
        console.log('🔍 Vérification de la limite de rapports...');
        
        const limitCheck = await Utils.checkReportsLimit();
        
        console.log('📊 Résultat vérification:', limitCheck);
        
        if (!limitCheck.canCreate) {
            console.log('🚫 LIMITE ATTEINTE - Plan FREE: ' + limitCheck.count + '/5');
            
            Utils.showUpgradeModal(
                '🚫 Limite mensuelle atteinte !',
                `Vous avez utilisé vos <strong>${limitCheck.limit} rapports gratuits</strong> ce mois-ci.<br><br>
                Passez au plan <strong>PRO</strong> pour créer des rapports illimités !`,
                'report_creation'
            );
            
            return; // ⛔ BLOQUER L'ENVOI
        }
        
        console.log('✅ Limite OK - Envoi autorisé (' + limitCheck.count + '/' + (limitCheck.isPro ? '∞' : '5') + ')');

        // ============================================
        // Continuer normalement si limite OK
        // ============================================

        if (this.sendAudioBtn) {
            this.sendAudioBtn.disabled = true;
            this.sendAudioBtn.textContent = t('drafts.sending');
        }

        try {
            console.log('=== DÉBUT ENVOI AUDIO ===');
            
            let audioBlob;
            let sourceInfo;
            
            if (this.uploadedFile) {
                audioBlob = this.uploadedFile;
                sourceInfo = `Fichier uploadé: ${this.uploadedFile.name}`;
            } else {
                audioBlob = this.recordedBlob;
                sourceInfo = 'Enregistrement vocal';
            }
            
            console.log(sourceInfo, 'Taille:', audioBlob.size, 'bytes');
            
            const audioBase64 = await Utils.blobToBase64(audioBlob);
            console.log('Conversion base64 réussie, taille:', audioBase64.length, 'caractères');
            
            // Création du brouillon
            const brouillonId = Utils.generateId('brouillon_');
            const brouillon = {
                id: brouillonId,
                generatedReport: '',
                isModified: false,
                createdAt: new Date().toISOString(),
                status: 'generating',
                title: t('status.generating'),
                sourceType: this.uploadedFile ? 'upload' : 'recording',
                sourceInfo: sourceInfo
            };

            // Ajout du brouillon via le DataManager
            if (window.dataManager) {
                window.dataManager.addBrouillon(brouillon);
            }
            
            // Reset de l'interface
            this.resetRecording();

            // Appel du webhook N8n
            console.log('Appel N8n...');
            await this.callN8nWebhook(audioBase64, brouillonId);
            console.log('=== ENVOI AUDIO TERMINÉ ===');

            Utils.showToast(t('toast.audio.sent'), 'success');

        } catch (error) {
            console.error('Erreur dans sendAudio:', error);
            Utils.showToast(t('toast.audio.error.mic') + ': ' + error.message, 'error');
        } finally {
            if (this.sendAudioBtn) {
                this.sendAudioBtn.disabled = false;
                this.sendAudioBtn.textContent = t('drafts.send');
            }
        }
    }

    async callN8nWebhook(audioBase64, brouillonId) {
        try {
            console.log('=== APPEL N8N WEBHOOK ===');
            
            const currentUser = window.app ? window.app.getCurrentUser() : null;
            const payload = {
                audioData: audioBase64,
                userId: currentUser ? currentUser.username : 'unknown',
                timestamp: new Date().toISOString()
            };

            console.log('URL N8n:', CONFIG.N8N_WEBHOOK_URL);
            console.log('Payload size:', JSON.stringify(payload).length, 'caractères');

            const response = await fetch(CONFIG.N8N_WEBHOOK_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload)
            });

            console.log('Response status:', response.status);
            console.log('Response ok:', response.ok);

            if (response.ok) {
                const result = await response.json();
                console.log('N8n success result:', result);
                console.log('=== DEBUG RÉPONSE N8N ===', result);
                console.log('result.content:', result.content);
                console.log('result.title:', result.title);
                console.log('Toutes les clés:', Object.keys(result));
                
                // Mise à jour du brouillon avec le contenu reçu
                if (window.dataManager) {
                    const reportContent = result.content || result.title || 'Erreur: contenu non reçu de N8n';
                    window.dataManager.updateBrouillonWithReport(brouillonId, reportContent);
                }
            } else {
                const errorText = await response.text();
                console.error('N8n HTTP error:', response.status, errorText);
                throw new Error(`N8n HTTP ${response.status}: ${errorText}`);
            }

        } catch (error) {
            console.error('Exception dans callN8nWebhook:', error);
            
            // Mise à jour du statut d'erreur
            if (window.dataManager) {
                window.dataManager.updateBrouillonStatus(brouillonId, 'error');
            }
            
            throw error;
        }
    }

    // === MISE À JOUR DE L'INTERFACE ===

    updateRecordingUI(recording) {
        if (!this.recordBtn || !this.recordingStatus) return;

        if (recording) {
            this.recordBtn.textContent = '⏹️';
            this.recordBtn.classList.add('recording');
            this.recordingStatus.textContent = t('drafts.record.recording');
            
            if (this.audioControls) {
                this.audioControls.classList.remove('show');
            }
            if (this.sendAudioBtn) {
                this.sendAudioBtn.classList.remove('show');
            }
        } else {
            this.recordBtn.textContent = '⏺️';
            this.recordBtn.classList.remove('recording');
            this.recordingStatus.textContent = t('drafts.record.done');
            
            if (this.audioControls) {
                this.audioControls.classList.add('show');
            }
            if (this.sendAudioBtn) {
                this.sendAudioBtn.classList.add('show');
            }
        }
    }

    resetRecordingUI() {
        if (this.recordBtn) {
            this.recordBtn.textContent = '⏺️';
            this.recordBtn.classList.remove('recording');
        }
    }

    updateUploadStatus(message) {
        if (this.uploadStatus) {
            this.uploadStatus.textContent = message;
        }
    }

    // === MÉTHODES PUBLIQUES ===

    hasAudioReady() {
        return !!(this.recordedBlob || this.uploadedFile);
    }

    getCurrentAudioInfo() {
        if (this.uploadedFile) {
            return {
                type: 'upload',
                name: this.uploadedFile.name,
                size: this.uploadedFile.size
            };
        } else if (this.recordedBlob) {
            return {
                type: 'recording',
                name: 'Enregistrement vocal',
                size: this.recordedBlob.size
            };
        }
        return null;
    }
}