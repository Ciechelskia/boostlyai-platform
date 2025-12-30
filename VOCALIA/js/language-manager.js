// Gestionnaire de langues pour l'application
class LanguageManager {
    constructor() {
        this.currentLang = 'fr'; // Langue par défaut temporaire (sera écrasée par init)
        this.storageKey = 'app_language';
        this.supportedLanguages = {
            fr: { name: 'Français', flag: '🇫🇷' },
            en: { name: 'English', flag: '🇬🇧' },
            zh: { name: '中文', flag: '🇨🇳' },
            ja: { name: '日本語', flag: '🇯🇵' }
        };
        
        // NE PAS appeler init() ici car les traductions ne sont pas encore chargées
        // init() sera appelé depuis app.js après le chargement complet
    }

    // Initialisation - LIT LE LOCALSTORAGE EN PRIORITÉ, PUIS DÉTECTE LE NAVIGATEUR
    init() {
        console.log('🔄 Initialisation LanguageManager...');
        
        // 1. PRIORITÉ ABSOLUE : Langue sauvegardée dans localStorage (synchronisée avec landing)
        const savedLang = localStorage.getItem(this.storageKey);
        
        if (savedLang && this.supportedLanguages[savedLang]) {
            this.currentLang = savedLang;
            console.log(`🌍 App: Langue chargée depuis localStorage: ${this.currentLang}`);
        } 
        // 2. Sinon, détecter la langue du navigateur
        else {
            const browserLang = navigator.language.split('-')[0]; // 'fr-FR' -> 'fr'
            console.log(`🔍 Langue du navigateur détectée: ${browserLang}`);
            
            if (this.supportedLanguages[browserLang]) {
                this.currentLang = browserLang;
                console.log(`🌍 App: Langue du navigateur utilisée: ${this.currentLang}`);
            } else {
                // 3. Fallback : Français par défaut
                this.currentLang = 'fr';
                console.log(`🌍 App: Langue par défaut (français) appliquée`);
            }
            
            // Sauvegarder le choix
            localStorage.setItem(this.storageKey, this.currentLang);
            console.log(`💾 Langue sauvegardée dans localStorage: ${this.currentLang}`);
        }
        
        console.log(`✅ App: Langue initialisée: ${this.currentLang}`);
        return this.currentLang;
    }

    // Obtenir la langue actuelle
    getCurrentLanguage() {
        return this.currentLang;
    }

    // Changer la langue
    setLanguage(langCode) {
        if (!this.supportedLanguages[langCode]) {
            console.warn(`⚠️ Langue non supportée: ${langCode}`);
            return false;
        }

        this.currentLang = langCode;
        localStorage.setItem(this.storageKey, langCode);
        
        console.log(`🌍 App: Langue changée: ${langCode}`);
        
        // Mettre à jour TOUS les sélecteurs de langue présents dans la page
        this.updateAllLanguageSelectors();
        
        // Déclencher un événement personnalisé pour notifier le changement
        window.dispatchEvent(new CustomEvent('languageChanged', { 
            detail: { language: langCode } 
        }));
        
        return true;
    }

    // Mettre à jour tous les sélecteurs de langue
    updateAllLanguageSelectors() {
        const allSelectors = document.querySelectorAll('.language-selector');
        allSelectors.forEach(container => {
            this.updateLanguageSelector(container);
        });
    }

    // Traduire une clé
    translate(key, params = {}) {
        // Récupérer la traduction dans la langue courante
        let translation = TRANSLATIONS[this.currentLang]?.[key];
        
        // Si pas de traduction, fallback vers le français
        if (!translation) {
            console.warn(`⚠️ Traduction manquante pour "${key}" en ${this.currentLang}`);
            translation = TRANSLATIONS['fr']?.[key] || key;
        }
        
        // Remplacer les paramètres {name}, {count}, etc.
        return translation.replace(/\{(\w+)\}/g, (match, param) => {
            return params[param] !== undefined ? params[param] : match;
        });
    }

    // Alias court pour translate
    t(key, params = {}) {
        return this.translate(key, params);
    }

    // Obtenir toutes les langues supportées
    getSupportedLanguages() {
        return this.supportedLanguages;
    }

    // Obtenir les infos de la langue actuelle
    getCurrentLanguageInfo() {
        return this.supportedLanguages[this.currentLang];
    }

    // Créer le sélecteur de langue HTML
    createLanguageSelector() {
        const container = document.createElement('div');
        container.className = 'language-selector';
        container.innerHTML = `
            <button class="lang-btn" id="langBtn">
                <span class="lang-flag">${this.getCurrentLanguageInfo().flag}</span>
                <span class="lang-code">${this.currentLang.toUpperCase()}</span>
                <span class="lang-arrow">▼</span>
            </button>
            <div class="lang-dropdown" id="langDropdown" style="display: none;">
                ${Object.entries(this.supportedLanguages).map(([code, info]) => `
                    <button class="lang-option ${code === this.currentLang ? 'active' : ''}" data-lang="${code}">
                        <span class="lang-flag">${info.flag}</span>
                        <span class="lang-name">${info.name}</span>
                        ${code === this.currentLang ? '<span class="lang-check">✓</span>' : ''}
                    </button>
                `).join('')}
            </div>
        `;

        // Événements
        const langBtn = container.querySelector('#langBtn');
        const langDropdown = container.querySelector('#langDropdown');
        const langOptions = container.querySelectorAll('.lang-option');

        langBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isVisible = langDropdown.style.display === 'block';
            langDropdown.style.display = isVisible ? 'none' : 'block';
        });

        langOptions.forEach(option => {
            option.addEventListener('click', (e) => {
                e.stopPropagation();
                const newLang = option.dataset.lang;
                
                if (this.setLanguage(newLang)) {
                    // Mettre à jour l'interface
                    this.updateUI();
                }
                
                langDropdown.style.display = 'none';
            });
        });

        // Fermer le dropdown si on clique ailleurs
        document.addEventListener('click', () => {
            langDropdown.style.display = 'none';
        });

        return container;
    }

    // Mettre à jour le sélecteur de langue
    updateLanguageSelector(container) {
        const langBtn = container.querySelector('.lang-btn');
        const langFlag = langBtn?.querySelector('.lang-flag');
        const langCode = langBtn?.querySelector('.lang-code');
        const langOptions = container.querySelectorAll('.lang-option');

        if (langFlag) langFlag.textContent = this.getCurrentLanguageInfo().flag;
        if (langCode) langCode.textContent = this.currentLang.toUpperCase();

        langOptions.forEach(option => {
            const optionLang = option.dataset.lang;
            const isActive = optionLang === this.currentLang;
            
            option.classList.toggle('active', isActive);
            
            const check = option.querySelector('.lang-check');
            if (check) {
                check.remove();
            }
            
            if (isActive) {
                const checkSpan = document.createElement('span');
                checkSpan.className = 'lang-check';
                checkSpan.textContent = '✓';
                option.appendChild(checkSpan);
            }
        });
    }

    // Mettre à jour toute l'interface avec les nouvelles traductions
    updateUI() {
        console.log(`🔄 Mise à jour UI avec langue: ${this.currentLang}`);
        
        // Mettre à jour les éléments avec data-i18n
        document.querySelectorAll('[data-i18n]').forEach(element => {
            const key = element.getAttribute('data-i18n');
            
            // Ne pas écraser les éléments qui contiennent des spans avec IDs (compteurs)
            const hasCounters = element.querySelector('#rapportsCount') || element.querySelector('#pdfCount');
            
            if (!hasCounters) {
                const params = {};
                
                // Récupérer les paramètres depuis data-i18n-params si présents
                const paramsAttr = element.getAttribute('data-i18n-params');
                if (paramsAttr) {
                    try {
                        Object.assign(params, JSON.parse(paramsAttr));
                    } catch (e) {
                        console.warn('Erreur parsing data-i18n-params:', e);
                    }
                }
                
                const translatedText = this.t(key, params);
                element.textContent = translatedText;
            }
        });

        // Mettre à jour les placeholders
        document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
            const key = element.getAttribute('data-i18n-placeholder');
            element.placeholder = this.t(key);
        });

        // Mettre à jour les titres (title attribute)
        document.querySelectorAll('[data-i18n-title]').forEach(element => {
            const key = element.getAttribute('data-i18n-title');
            element.title = this.t(key);
        });

        console.log(`✅ Interface mise à jour avec la langue: ${this.currentLang}`);
    }

    // Traduire dynamiquement un texte HTML
    translateHTML(html) {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        
        tempDiv.querySelectorAll('[data-i18n]').forEach(element => {
            const key = element.getAttribute('data-i18n');
            element.textContent = this.t(key);
        });
        
        return tempDiv.innerHTML;
    }

    // Ajouter les styles CSS pour le sélecteur de langue
    injectStyles() {
        if (document.getElementById('language-selector-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'language-selector-styles';
        style.textContent = `
            .language-selector {
                position: relative;
                display: inline-block;
            }

            .lang-btn {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 8px 12px;
                border: 2px solid var(--gray-300);
                border-radius: 12px;
                background: white;
                cursor: pointer;
                font-size: 14px;
                font-weight: 600;
                transition: all 0.3s ease;
                color: var(--gray-700);
            }

            .lang-btn:hover {
                border-color: var(--primary);
                background: var(--primary-ultra-light);
                transform: translateY(-1px);
            }

            .lang-flag {
                font-size: 18px;
                line-height: 1;
            }

            .lang-code {
                font-size: 12px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }

            .lang-arrow {
                font-size: 10px;
                transition: transform 0.3s ease;
            }

            .lang-btn:hover .lang-arrow {
                transform: translateY(2px);
            }

            .lang-dropdown {
                position: absolute;
                top: calc(100% + 8px);
                right: 0;
                background: white;
                border-radius: 12px;
                box-shadow: var(--shadow-xl);
                border: 1px solid var(--gray-200);
                min-width: 180px;
                z-index: 1000;
                animation: dropdownSlideIn 0.3s ease;
                overflow: hidden;
            }

            @keyframes dropdownSlideIn {
                from {
                    opacity: 0;
                    transform: translateY(-10px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }

            .lang-option {
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 12px 16px;
                border: none;
                background: white;
                cursor: pointer;
                width: 100%;
                text-align: left;
                transition: background 0.2s ease;
                color: var(--gray-700);
                font-size: 14px;
                font-weight: 500;
            }

            .lang-option:hover {
                background: var(--primary-ultra-light);
            }

            .lang-option.active {
                background: var(--primary-light);
                color: var(--primary-dark);
                font-weight: 600;
            }

            .lang-option .lang-name {
                flex: 1;
            }

            .lang-check {
                color: var(--primary);
                font-weight: bold;
                font-size: 16px;
            }

            /* Responsive */
            @media (max-width: 480px) {
                .lang-btn {
                    padding: 6px 10px;
                    gap: 6px;
                }
                
                .lang-code {
                    display: none;
                }
                
                .lang-dropdown {
                    right: -10px;
                }
            }
        `;
        document.head.appendChild(style);
    }
}

// ❌ DÉSACTIVÉ : window.t est maintenant défini dans app.js après l'initialisation
// Cette définition prématurée causait le bug des traductions non affichées
// car window.languageManager n'existe pas encore au chargement de ce fichier

// Fonction globale de traduction (raccourci) - DÉSACTIVÉ
// window.t = function(key, params = {}) {
//     if (window.languageManager) {
//         return window.languageManager.t(key, params);
//     }
//     return key;
// };

// Export pour utilisation
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LanguageManager;
}