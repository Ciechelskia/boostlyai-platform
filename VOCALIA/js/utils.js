// Utilitaires généraux avec améliorations UX
class Utils {
    
    // ✅ CORRECTION : Génère un ID unique PERSISTANT pour l'appareil
    static generateDeviceId() {
        // Vérifier si un ID existe déjà dans localStorage
        let deviceId = localStorage.getItem('vocalia_device_id');
        
        if (deviceId) {
            console.log('📱 Device ID existant trouvé:', deviceId.substring(0, 20) + '...');
            return deviceId;
        }
        
        // Créer un nouvel ID basé sur les caractéristiques de l'appareil
        const screen = `${window.screen.width}x${window.screen.height}`;
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const language = navigator.language;
        const platform = navigator.platform;
        const userAgent = navigator.userAgent.substring(0, 50);
        
        // Ajouter un timestamp et un nombre aléatoire pour garantir l'unicité
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 15);
        
        // Créer l'ID et le nettoyer
        deviceId = btoa(`${screen}-${timezone}-${language}-${platform}-${userAgent}-${timestamp}-${random}`)
            .replace(/[^a-zA-Z0-9]/g, '')
            .substring(0, 64);
        
        // Sauvegarder dans localStorage
        localStorage.setItem('vocalia_device_id', deviceId);
        console.log('📱 Nouveau Device ID créé:', deviceId.substring(0, 20) + '...');
        
        return deviceId;
    }

    // ✅ NOUVEAU : Détecte le nom lisible de l'appareil
    static getDeviceName() {
        const ua = navigator.userAgent;
        const platform = navigator.platform;
        
        // Détecter iOS
        if (/iPhone/i.test(ua)) {
            // Tenter de détecter le modèle d'iPhone
            if (/iPhone OS 1[6-9]|iPhone OS [2-9][0-9]/i.test(ua)) {
                // iPhone récent (iOS 16+)
                const screenWidth = window.screen.width;
                const screenHeight = window.screen.height;
                
                // Détection basée sur la résolution
                if (screenWidth === 430 && screenHeight === 932) return '📱 iPhone 16 Pro Max';
                if (screenWidth === 393 && screenHeight === 852) return '📱 iPhone 16 Pro';
                if (screenWidth === 390 && screenHeight === 844) return '📱 iPhone 16';
                if (screenWidth === 428 && screenHeight === 926) return '📱 iPhone 15 Pro Max';
                if (screenWidth === 393 && screenHeight === 852) return '📱 iPhone 15 Pro';
                if (screenWidth === 390 && screenHeight === 844) return '📱 iPhone 14/15';
                
                return '📱 iPhone';
            }
            return '📱 iPhone';
        }
        
        // Détecter iPad
        if (/iPad/i.test(ua) || (platform === 'MacIntel' && navigator.maxTouchPoints > 1)) {
            const screenWidth = window.screen.width;
            if (screenWidth >= 1024) return '📱 iPad Pro';
            return '📱 iPad';
        }
        
        // Détecter Mac
        if (/Macintosh|MacIntel|MacPPC|Mac68K/i.test(platform)) {
            // Détecter le type de Mac approximativement
            const screenWidth = window.screen.width;
            
            if (screenWidth >= 3024) return '💻 MacBook Pro 16"';
            if (screenWidth >= 2560) return '💻 MacBook Pro 14"';
            if (screenWidth >= 2304) return '💻 MacBook Air M2/M3';
            if (screenWidth >= 1440) return '💻 MacBook Air';
            
            return '💻 Mac';
        }
        
        // Détecter Windows
        if (/Windows/i.test(ua)) {
            if (/Windows NT 10/i.test(ua)) return '💻 PC Windows 10/11';
            return '💻 PC Windows';
        }
        
        // Détecter Android
        if (/Android/i.test(ua)) {
            // Extraire le modèle si disponible
            const modelMatch = ua.match(/Android.*;\s([^)]+)\)/);
            if (modelMatch && modelMatch[1]) {
                const model = modelMatch[1].trim();
                // Nettoyer le modèle
                const cleanModel = model.replace(/Build\/.*/i, '').trim();
                return `📱 ${cleanModel}`;
            }
            return '📱 Android';
        }
        
        // Détecter Linux
        if (/Linux/i.test(ua)) {
            return '💻 Linux';
        }
        
        // Fallback
        return '💻 Appareil';
    }

    // ✅ NOUVEAU : Obtient le navigateur
    static getBrowserName() {
        const ua = navigator.userAgent;
        
        if (/Edg/i.test(ua)) return 'Edge';
        if (/Chrome/i.test(ua) && !/Edg/i.test(ua)) return 'Chrome';
        if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) return 'Safari';
        if (/Firefox/i.test(ua)) return 'Firefox';
        if (/Opera|OPR/i.test(ua)) return 'Opera';
        
        return 'Navigateur';
    }

    // Génère un ID unique pour les documents
    static generateId(prefix = '') {
        return prefix + Date.now().toString() + Math.random().toString(36).substr(2, 9);
    }

    // Convertit un Blob en base64
    static blobToBase64(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64 = reader.result.split(',')[1];
                resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }

    // Valide le format de fichier audio
    static isValidAudioFile(file) {
        return CONFIG.SUPPORTED_AUDIO_FORMATS.includes(file.type);
    }

    // Valide la taille du fichier
    static isValidFileSize(file) {
        return file.size <= CONFIG.MAX_FILE_SIZE;
    }

    // Formate la taille du fichier
    static formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // Formate une date
    static formatDate(date) {
        return new Date(date).toLocaleString('fr-FR', {
            year: 'numeric',
            month: 'short',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    // ✅ CORRECTION COMPLÈTE : createModal() avec footer TOUJOURS créé
    static createModal(title, content, buttons = []) {
        // Créer l'overlay
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.setAttribute('data-modal', 'true');
        overlay.style.opacity = '0';

        // Créer le conteneur du modal
        const modalContent = document.createElement('div');
        modalContent.className = 'modal-content';

        // ✅ HEADER
        const header = document.createElement('div');
        header.className = 'modal-header';
        
        const titleElement = document.createElement('h3');
        titleElement.textContent = title;
        
        const closeButton = document.createElement('button');
        closeButton.className = 'modal-close';
        closeButton.innerHTML = '×';
        closeButton.addEventListener('click', () => {
            Utils.closeModal(overlay);
        });
        
        header.appendChild(titleElement);
        header.appendChild(closeButton);

        // ✅ BODY
        const body = document.createElement('div');
        body.className = 'modal-body';
        body.innerHTML = content;

        // ✅ FOOTER (TOUJOURS créé, même si vide)
        const footer = document.createElement('div');
        footer.className = 'modal-footer';

        // ✅ Si des boutons sont fournis (ancien système avec onclick string)
        if (buttons && buttons.length > 0) {
            buttons.forEach(btn => {
                const button = document.createElement('button');
                button.className = btn.class || 'btn-secondary';
                button.textContent = btn.text;
                
                if (btn.onclick) {
                    if (typeof btn.onclick === 'string') {
                        // Ancien système : onclick en string
                        button.setAttribute('onclick', btn.onclick);
                    } else if (typeof btn.onclick === 'function') {
                        // Nouveau système : vraie fonction
                        button.addEventListener('click', btn.onclick);
                    }
                }
                
                footer.appendChild(button);
            });
        }

        // ✅ ASSEMBLAGE
        modalContent.appendChild(header);
        modalContent.appendChild(body);
        modalContent.appendChild(footer); // ✅ TOUJOURS ajouter le footer
        overlay.appendChild(modalContent);

        // ✅ Fermer en cliquant sur l'overlay
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                Utils.closeModal(overlay);
            }
        });

        // ✅ Fermer avec la touche Escape
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                Utils.closeModal(overlay);
                document.removeEventListener('keydown', handleEscape);
            }
        };
        document.addEventListener('keydown', handleEscape);

        // ✅ Ajouter au DOM
        document.body.appendChild(overlay);

        // ✅ Animation d'entrée
        requestAnimationFrame(() => {
            overlay.style.opacity = '1';
        });

        return overlay;
    }

    // Ferme une modal avec animation
    static closeModal(modal) {
        modal.style.opacity = '0';
        setTimeout(() => {
            if (modal && modal.parentNode) {
                modal.remove();
            }
        }, 300);
    }

    // Génère du PDF à partir de texte avec loading
    static async generatePDF(title, content) {
        const loadingToast = Utils.showToast(t('toast.report.pdf.generating'), 'info', 0);
        
        try {
            if (typeof window.jsPDF === 'undefined') {
                await Utils.loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
            }
            
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            
            doc.setFont("helvetica", "bold");
            doc.setFontSize(18);
            doc.setTextColor(102, 126, 234);
            doc.text(title, 20, 30);
            
            doc.setDrawColor(102, 126, 234);
            doc.setLineWidth(0.5);
            doc.line(20, 35, 190, 35);
            
            doc.setFont("helvetica", "normal");
            doc.setFontSize(10);
            doc.setTextColor(100, 100, 100);
            doc.text(`${t('date.generated')} ${new Date().toLocaleDateString()}`, 20, 45);
            
            doc.setFontSize(11);
            doc.setTextColor(0, 0, 0);
            const lines = doc.splitTextToSize(content, 170);
            doc.text(lines, 20, 60);
            
            const pageCount = doc.internal.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.setFontSize(8);
                doc.setTextColor(150, 150, 150);
                doc.text(`Page ${i} / ${pageCount}`, 20, 285);
                doc.text(t('app.title') + ' - Application PWA', 105, 285, { align: 'center' });
            }
            
            if (loadingToast) loadingToast.remove();
            return doc;
            
        } catch (error) {
            if (loadingToast) loadingToast.remove();
            throw error;
        }
    }

    // Charge un script externe dynamiquement
    static loadScript(src) {
        return new Promise((resolve, reject) => {
            if (document.querySelector(`script[src="${src}"]`)) {
                resolve();
                return;
            }
            
            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = () => reject(new Error(`Impossible de charger ${src}`));
            document.head.appendChild(script);
        });
    }

    // Télécharge un fichier avec feedback
    static downloadFile(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 100);
        
        Utils.showToast(t('toast.download', { filename }), 'success');
    }

    // Copie du texte dans le presse-papier
    static async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            Utils.showToast(t('toast.clipboard.copied'), 'success');
            return true;
        } catch (err) {
            console.error('Erreur lors de la copie:', err);
            
            try {
                const textArea = document.createElement('textarea');
                textArea.value = text;
                textArea.style.position = 'fixed';
                textArea.style.opacity = '0';
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
                Utils.showToast(t('toast.clipboard.copied'), 'success');
                return true;
            } catch (fallbackErr) {
                Utils.showToast(t('toast.clipboard.error'), 'error');
                return false;
            }
        }
    }

    // Partage natif
    static async shareContent(title, text) {
        if (navigator.share) {
            try {
                await navigator.share({ title, text });
                Utils.showToast(t('toast.report.shared'), 'success');
                return true;
            } catch (err) {
                if (err.name !== 'AbortError') {
                    console.error('Erreur lors du partage:', err);
                    Utils.showToast(t('toast.report.share.error'), 'error');
                }
                return false;
            }
        }
        return false;
    }

    // Affiche une notification toast
    static showToast(message, type = 'info', duration = 3000) {
        const existingToasts = document.querySelectorAll(`.toast-${type}`);
        existingToasts.forEach(toast => toast.remove());
        
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
                <span style="font-size: 18px;">${Utils.getToastIcon(type)}</span>
                <span>${message}</span>
            </div>
        `;
        
        const colors = {
            error: 'linear-gradient(135deg, #f44336, #d32f2f)',
            success: 'linear-gradient(135deg, #4CAF50, #45a049)',
            info: 'linear-gradient(135deg, #2196F3, #1976D2)',
            warning: 'linear-gradient(135deg, #FF9800, #F57C00)'
        };
        
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 16px 24px;
            background: ${colors[type] || colors.info};
            color: white;
            border-radius: 15px;
            z-index: 10000;
            font-weight: 600;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            backdrop-filter: blur(10px);
            max-width: 350px;
            word-wrap: break-word;
            transform: translateX(100%) scale(0.8);
            opacity: 0;
            transition: all 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
        `;
        
        document.body.appendChild(toast);
        
        requestAnimationFrame(() => {
            toast.style.transform = 'translateX(0) scale(1)';
            toast.style.opacity = '1';
        });
        
        if (duration > 0) {
            const progressBar = document.createElement('div');
            progressBar.style.cssText = `
                position: absolute;
                bottom: 0;
                left: 0;
                height: 3px;
                background: rgba(255,255,255,0.3);
                border-radius: 0 0 15px 15px;
                width: 100%;
                transform-origin: left;
                animation: toastProgress ${duration}ms linear;
            `;
            
            const style = document.createElement('style');
            style.textContent = `
                @keyframes toastProgress {
                    from { transform: scaleX(1); }
                    to { transform: scaleX(0); }
                }
            `;
            document.head.appendChild(style);
            toast.appendChild(progressBar);
        }
        
        if (duration > 0) {
            setTimeout(() => {
                toast.style.transform = 'translateX(100%) scale(0.8)';
                toast.style.opacity = '0';
                setTimeout(() => {
                    if (toast.parentNode) {
                        toast.remove();
                    }
                }, 400);
            }, duration);
        }
        
        toast.addEventListener('click', () => {
            toast.style.transform = 'translateX(100%) scale(0.8)';
            toast.style.opacity = '0';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.remove();
                }
            }, 300);
        });
        
        return toast;
    }

    // Icônes pour les toasts
    static getToastIcon(type) {
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };
        return icons[type] || icons.info;
    }// Skeleton loading pour les listes
    static showSkeletonLoading(container, count = 3) {
        const skeletons = Array.from({ length: count }, (_, i) => `
            <div class="report-item skeleton-item" style="animation-delay: ${i * 0.1}s">
                <div class="report-header">
                    <div class="skeleton skeleton-title"></div>
                    <div class="skeleton skeleton-text" style="width: 80px;"></div>
                </div>
                <div class="skeleton skeleton-text"></div>
                <div class="skeleton skeleton-text" style="width: 70%;"></div>
                <div class="report-actions" style="margin-top: 15px;">
                    <div class="skeleton skeleton-button"></div>
                    <div class="skeleton skeleton-button"></div>
                    <div class="skeleton skeleton-button"></div>
                </div>
            </div>
        `).join('');
        
        container.innerHTML = skeletons;
        
        setTimeout(() => {
            const skeletonItems = container.querySelectorAll('.skeleton-item');
            if (skeletonItems.length > 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <div class="icon">⚠️</div>
                        <p>${t('loading')}</p>
                        <p class="empty-subtitle">${t('toast.network.offline')}</p>
                    </div>
                `;
            }
        }, 5000);
    }

    // Débounce
    static debounce(func, wait, immediate = false) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                if (!immediate) func(...args);
            };
            const callNow = immediate && !timeout;
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
            if (callNow) func(...args);
        };
    }

    // Throttle pour limiter les appels
    static throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    // Détection de la connexion réseau
    static isOnline() {
        return navigator.onLine;
    }

    // Surveillance de la connexion réseau
    static onNetworkChange(callback) {
        window.addEventListener('online', () => callback(true));
        window.addEventListener('offline', () => callback(false));
    }

    // Animation de feedback pour les boutons
    static animateButtonClick(button) {
        button.style.transform = 'scale(0.95)';
        setTimeout(() => {
            button.style.transform = '';
        }, 150);
    }

    // Scroll fluide vers un élément
    static smoothScrollTo(element, offset = 0) {
        const targetPosition = element.offsetTop - offset;
        window.scrollTo({
            top: targetPosition,
            behavior: 'smooth'
        });
    }

    // Détection du support PWA
    static isPWAInstallable() {
        return 'serviceWorker' in navigator && 'PushManager' in window;
    }

    // Prompt d'installation PWA
    static showInstallPrompt(deferredPrompt) {
        if (!deferredPrompt) return false;
        
        const modal = Utils.createModal(
            '📱 Installer l\'application',
            `
                <div style="text-align: center; padding: 20px;">
                    <div style="font-size: 48px; margin-bottom: 20px;">📋</div>
                    <p style="margin-bottom: 20px; line-height: 1.5;">
                        Installez l'application Rapports Commerciaux sur votre appareil pour un accès rapide et une expérience optimisée.
                    </p>
                    <ul style="text-align: left; margin: 20px 0; color: #666;">
                        <li>✅ Accès hors ligne</li>
                        <li>✅ Notifications push</li>
                        <li>✅ Démarrage rapide</li>
                        <li>✅ Pas d'icône de navigateur</li>
                    </ul>
                </div>
            `,
            [
                { text: 'Plus tard', class: 'btn-secondary', onclick: 'this.closest("[data-modal]").remove()' },
                { 
                    text: '📱 Installer', 
                    class: 'btn-primary', 
                    onclick: `
                        window.deferredInstallPrompt.prompt();
                        this.closest("[data-modal]").remove();
                    `
                }
            ]
        );
        
        window.deferredInstallPrompt = deferredPrompt;
        return true;
    }

    // Valide une adresse email
    static isValidEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    // Échappe les caractères HTML
    static escapeHtml(text) {
        if (!text) return '';
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }

    // Tronque un texte
    static truncateText(text, maxLength) {
        if (!text || text.length <= maxLength) return text;
        return text.substring(0, maxLength).trim() + '...';
    }
    
    // Formatage intelligent du texte
    static formatText(text, options = {}) {
        if (!text) return '';
        
        const {
            maxLength = null,
            highlightTerms = [],
            preserveNewlines = false
        } = options;
        
        let formatted = text;
        
        if (preserveNewlines) {
            formatted = formatted.replace(/\n/g, '<br>');
        }
        
        highlightTerms.forEach(term => {
            if (term.length > 0) {
                const regex = new RegExp(`(${Utils.escapeRegex(term)})`, 'gi');
                formatted = formatted.replace(regex, '<mark style="background: #ffeb3b; padding: 2px 4px; border-radius: 3px;">$1</mark>');
            }
        });
        
        if (maxLength && formatted.length > maxLength) {
            formatted = Utils.truncateText(formatted, maxLength);
        }
        
        return formatted;
    }
    
    // Échapper les caractères spéciaux pour regex
    static escapeRegex(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
    
    // Vibration tactile
    static vibrate(pattern = [100]) {
        if ('vibrate' in navigator) {
            navigator.vibrate(pattern);
        }
    }
    
    // Détection du type d'appareil
    static getDeviceType() {
        const userAgent = navigator.userAgent.toLowerCase();
        if (/android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent)) {
            return 'mobile';
        } else if (/tablet|ipad/i.test(userAgent)) {
            return 'tablet';
        }
        return 'desktop';
    }
    
    // Mesure de performance
    static measurePerformance(name, fn) {
        return async function(...args) {
            const start = performance.now();
            const result = await fn.apply(this, args);
            const end = performance.now();
            console.log(`⏱️ ${name} took ${(end - start).toFixed(2)}ms`);
            return result;
        };
    }
    
    // Gestion des erreurs avec retry
    static async retryOperation(operation, maxRetries = 3, delay = 1000) {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                return await operation();
            } catch (error) {
                console.warn(`Tentative ${attempt} échouée:`, error);
                
                if (attempt === maxRetries) {
                    throw new Error(`Opération échouée après ${maxRetries} tentatives: ${error.message}`);
                }
                
                await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, attempt - 1)));
            }
        }
    }

    // ============================================
    // 🚀 NOUVELLES FONCTIONS POUR RESTRICTIONS FREE/PRO
    // ============================================

    /**
     * Vérifie le plan de l'utilisateur actuel
     * @returns {Promise<string>} 'free' ou 'pro'
     */
    static async checkUserPlan() {
        const currentUser = window.appManager?.getCurrentUser();
        if (!currentUser || !currentUser.id) {
            return 'free';
        }
        
        // ✅ OPTIMISATION : Lire depuis la mémoire (chargé à la connexion)
        // Au lieu de faire un appel Supabase à chaque fois
        console.log('✅ Plan utilisateur (depuis mémoire):', currentUser.subscription_plan);
        return currentUser.subscription_plan || 'free';
        
        /* ANCIEN CODE QUI CAUSAIT LE FREEZE (désactivé) :
        try {
            const { data: profile, error } = await window.supabaseClient
                .from('profiles')
                .select('subscription_plan')
                .eq('id', currentUser.id)
                .single();
            
            if (error) throw error;
            return profile.subscription_plan || 'free';
        } catch (error) {
            console.error('❌ Erreur vérification plan:', error);
            return 'free';
        }
        */
    }
    
    /**
     * Vérifie si l'utilisateur FREE a atteint sa limite de rapports
     * @returns {Promise<Object>} { canCreate: boolean, count: number, limit: number, isPro: boolean }
     */
    static async checkReportsLimit() {
        const currentUser = window.appManager?.getCurrentUser();
        if (!currentUser || !currentUser.id) {
            return { canCreate: false, count: 0, limit: 5, isPro: false };
        }
        
        // ✅ OPTIMISATION : Lire depuis la mémoire (chargé à la connexion)
        const isPro = currentUser.subscription_plan === 'pro';
        const count = currentUser.reports_this_month || 0;
        const limit = isPro ? Infinity : 5;
        const canCreate = isPro || count < limit;
        
        console.log('✅ Limite rapports (depuis mémoire):', { canCreate, count, limit, isPro });
        
        return { canCreate, count, limit, isPro };
        
        /* ANCIEN CODE QUI CAUSAIT LE FREEZE (désactivé) :
        try {
            const { data: profile, error } = await window.supabaseClient
                .from('profiles')
                .select('subscription_plan, reports_this_month')
                .eq('id', currentUser.id)
                .single();
            
            if (error) throw error;
            
            const isPro = profile.subscription_plan === 'pro';
            const count = profile.reports_this_month || 0;
            const limit = isPro ? Infinity : 5;
            const canCreate = isPro || count < limit;
            
            return { canCreate, count, limit, isPro };
        } catch (error) {
            console.error('❌ Erreur vérification limite:', error);
            return { canCreate: false, count: 0, limit: 5, isPro: false };
        }
        */
    }
    
    /**
     * Affiche la modal d'upgrade avec message personnalisé
     * @param {string} title - Titre de la modal
     * @param {string} description - Description du feature bloqué
     * @param {string} feature - Nom du feature pour tracking
     */
    static showUpgradeModal(title, description, feature) {
        const modal = Utils.createModal(
            title,
            `<div style="text-align: center; padding: 20px;">
                <div style="font-size: 64px; margin-bottom: 20px;">🚀</div>
                <h3 style="color: var(--primary); margin-bottom: 15px; font-size: 20px;">
                    ${title}
                </h3>
                <p style="font-size: 16px; color: var(--gray-700); margin-bottom: 30px; line-height: 1.6;">
                    ${description}
                </p>
                
                <div style="background: linear-gradient(135deg, rgba(139, 21, 56, 0.1), rgba(255, 111, 0, 0.1)); padding: 25px; border-radius: 15px; margin-bottom: 25px;">
                    <h4 style="color: var(--primary); margin-bottom: 15px; font-size: 18px;">
                        ✨ Plan PRO - 14,99€/mois
                    </h4>
                    <ul style="text-align: left; list-style: none; padding: 0; margin: 0;">
                        <li style="padding: 8px 0; color: var(--gray-800);">
                            <strong>✅ Rapports illimités</strong> - Créez autant de rapports que vous voulez
                        </li>
                        <li style="padding: 8px 0; color: var(--gray-800);">
                            <strong>✅ Dossiers illimités</strong> - Organisez vos rapports
                        </li>
                        <li style="padding: 8px 0; color: var(--gray-800);">
                            <strong>✅ Support prioritaire 24/7</strong>
                        </li>
                    </ul>
                </div>
                
                <p style="font-size: 12px; color: var(--gray-500); margin-top: 20px;">
                    🔒 Paiement sécurisé par Stripe • Annulation à tout moment
                </p>
            </div>`,
            [] // ✅ Pas de boutons en config
        );
        
        // ✅ CORRECTION : Créer les boutons manuellement
        const footer = modal.querySelector('.modal-footer');
        footer.innerHTML = '';
        
        const laterBtn = document.createElement('button');
        laterBtn.className = 'btn-secondary';
        laterBtn.textContent = 'Plus tard';
        laterBtn.addEventListener('click', () => {
            modal.remove();
        });
        
        const upgradeBtn = document.createElement('button');
        upgradeBtn.className = 'btn-primary';
        upgradeBtn.textContent = '🚀 Passer au PRO maintenant';
        upgradeBtn.addEventListener('click', () => {
            if (window.appManager?.profileManager) {
                window.appManager.profileManager.handleUpgrade();
            }
            modal.remove();
        });
        
        footer.appendChild(laterBtn);
        footer.appendChild(upgradeBtn);
        
        console.log(`📊 Feature bloqué: ${feature}`);
    }
}