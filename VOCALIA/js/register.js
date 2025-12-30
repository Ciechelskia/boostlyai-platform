// Gestionnaire d'inscription pour VOCALIA
class RegisterManager {
    constructor() {
        this.supabase = null;
        this.languageManager = null;
        
        // Attendre que tout soit chargé avant d'initialiser
        this.init();
    }

    // === INITIALISATION ===
    async init() {
        // Attendre que Supabase soit chargé
        await this.waitForSupabase();
        
        // Initialiser l'app
        this.initializeApp();
        
        // Binder les événements
        this.bindEvents();
    }

    async waitForSupabase() {
        return new Promise((resolve) => {
            // Vérifier si Supabase est déjà disponible (soit la lib, soit le client)
            if (window.supabase || window.supabaseClient) {
                console.log('✅ Supabase déjà disponible');
                resolve();
                return;
            }

            // Sinon, attendre qu'il se charge
            let attempts = 0;
            const maxAttempts = 50; // 5 secondes max
            
            const checkInterval = setInterval(() => {
                attempts++;
                
                if (window.supabase || window.supabaseClient) {
                    clearInterval(checkInterval);
                    console.log('✅ Supabase chargé après', attempts * 100, 'ms');
                    resolve();
                } else if (attempts >= maxAttempts) {
                    clearInterval(checkInterval);
                    console.error('❌ Timeout: Supabase non chargé après 5 secondes');
                    resolve(); // Résoudre quand même pour éviter de bloquer
                }
            }, 100);
        });
    }

    initializeApp() {
        // Récupérer le client Supabase (déjà initialisé par supabase-config.js)
        if (window.supabase) {
            this.supabase = window.supabase;
            console.log('✅ Client Supabase récupéré dans register.js');
        } else if (window.supabaseClient) {
            this.supabase = window.supabaseClient;
            console.log('✅ Client Supabase récupéré (supabaseClient) dans register.js');
        } else {
            console.error('❌ Client Supabase non disponible');
        }

        // Initialiser le système de langues
        if (typeof LanguageManager !== 'undefined') {
            this.languageManager = new LanguageManager();
            window.languageManager = this.languageManager;
            
            this.languageManager.init();
            this.languageManager.injectStyles();
            
            // Créer le sélecteur de langue
            const langContainer = document.getElementById('registerLanguageSelector');
            if (langContainer) {
                const selector = this.languageManager.createLanguageSelector();
                langContainer.appendChild(selector);
            }
            
            this.languageManager.updateUI();
            
            // Écouter les changements de langue
            window.addEventListener('languageChanged', () => {
                this.languageManager.updateUI();
            });
        }

        console.log('✅ Page d\'inscription initialisée');
    }

    // === ÉVÉNEMENTS ===
    bindEvents() {
        const form = document.getElementById('registerForm');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleRegister();
            });
        }

        // Validation en temps réel du mot de passe
        const passwordInput = document.getElementById('password');
        if (passwordInput) {
            passwordInput.addEventListener('input', () => {
                this.checkPasswordStrength(passwordInput.value);
            });
        }

        // Validation confirmation mot de passe
        const confirmInput = document.getElementById('confirmPassword');
        if (confirmInput) {
            confirmInput.addEventListener('input', () => {
                this.checkPasswordMatch();
            });
        }
    }

    // === VALIDATION MOT DE PASSE ===
    checkPasswordStrength(password) {
        const strengthBar = document.getElementById('passwordStrength');
        if (!strengthBar) return;

        let strength = 0;
        
        if (password.length >= 8) strength++;
        if (password.length >= 12) strength++;
        if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
        if (/\d/.test(password)) strength++;
        if (/[^a-zA-Z\d]/.test(password)) strength++;

        strengthBar.className = 'password-strength';
        
        if (strength <= 2) {
            strengthBar.classList.add('weak');
        } else if (strength <= 3) {
            strengthBar.classList.add('medium');
        } else {
            strengthBar.classList.add('strong');
        }
    }

    checkPasswordMatch() {
        const password = document.getElementById('password').value;
        const confirm = document.getElementById('confirmPassword').value;
        const confirmInput = document.getElementById('confirmPassword');

        if (confirm.length > 0) {
            if (password === confirm) {
                confirmInput.style.borderColor = 'var(--success)';
            } else {
                confirmInput.style.borderColor = 'var(--error)';
            }
        }
    }

    // === INSCRIPTION ===
    async handleRegister() {
        const firstName = document.getElementById('firstName').value.trim();
        const lastName = document.getElementById('lastName').value.trim();
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        const acceptTerms = document.getElementById('acceptTerms').checked;

        const errorDiv = document.getElementById('errorMessage');
        const loadingDiv = document.getElementById('loadingMessage');
        const registerBtn = document.getElementById('registerBtn');

        // Reset UI
        if (errorDiv) errorDiv.style.display = 'none';
        if (loadingDiv) loadingDiv.style.display = 'none';

        // Vérifier que Supabase est initialisé
        if (!this.supabase) {
            this.showError('Erreur : Supabase non initialisé. Rechargez la page.');
            console.error('❌ Supabase non disponible');
            return;
        }

        // Validation
        if (!firstName || !lastName || !email || !password) {
            this.showError(t('register.error.empty'));
            return;
        }

        if (!Utils.isValidEmail(email)) {
            this.showError(t('register.error.email.invalid'));
            return;
        }

        if (password.length < 8) {
            this.showError(t('register.error.password.short'));
            return;
        }

        if (password !== confirmPassword) {
            this.showError(t('register.error.password.nomatch'));
            return;
        }

        if (!acceptTerms) {
            this.showError(t('register.error.terms'));
            return;
        }

        // Loading
        if (loadingDiv) loadingDiv.style.display = 'flex';
        if (registerBtn) registerBtn.disabled = true;

        try {
            console.log('📝 Inscription en cours...', { email, firstName, lastName });

            // 1. Créer le compte Supabase Auth
            const { data: authData, error: authError } = await this.supabase.auth.signUp({
                email: email,
                password: password,
                options: {
                    data: {
                        first_name: firstName,
                        last_name: lastName
                    }
                }
            });

            if (authError) {
                console.error('❌ Erreur auth:', authError);
                
                if (authError.message.includes('already registered')) {
                    throw new Error(t('register.error.email.exists'));
                }
                
                throw new Error(authError.message);
            }

            console.log('✅ Compte créé:', authData);

            // 2. Le profil est créé automatiquement par le trigger SQL
            console.log('✅ Profil créé automatiquement par trigger Supabase');

            // Attendre un peu pour s'assurer que le trigger a fini
            await new Promise(resolve => setTimeout(resolve, 1000));

            // 3. Rediriger vers page de confirmation
            this.showSuccess();

        } catch (error) {
            console.error('❌ Erreur inscription:', error);
            this.showError(error.message);
        } finally {
            if (loadingDiv) loadingDiv.style.display = 'none';
            if (registerBtn) registerBtn.disabled = false;
        }
    }

    // === AFFICHAGE MESSAGES ===
    showError(message) {
        const errorDiv = document.getElementById('errorMessage');
        if (errorDiv) {
            errorDiv.textContent = message;
            errorDiv.style.display = 'block';
            
            // Scroll vers le message
            errorDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }

    showSuccess() {
        // Créer une modal moderne et élégante
        const modal = document.createElement('div');
        modal.className = 'success-modal-overlay';
        modal.innerHTML = `
            <div class="success-modal-content">
                <div class="success-animation">
                    <div class="success-checkmark">
                        <div class="check-icon">
                            <span class="icon-line line-tip"></span>
                            <span class="icon-line line-long"></span>
                            <div class="icon-circle"></div>
                            <div class="icon-fix"></div>
                        </div>
                    </div>
                </div>
                
                <h2 class="success-title" data-i18n="register.success.title">
                    Compte créé avec succès !
                </h2>
                
                <div class="success-email-icon">
                    <svg width="80" height="80" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M4 4H20C21.1 4 22 4.9 22 6V18C22 19.1 21.1 20 20 20H4C2.9 20 2 19.1 2 18V6C2 4.9 2.9 4 4 4Z" stroke="url(#gradient)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M22 6L12 13L2 6" stroke="url(#gradient)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <defs>
                            <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" style="stop-color:#8B1538;stop-opacity:1" />
                                <stop offset="100%" style="stop-color:#F59E0B;stop-opacity:1" />
                            </linearGradient>
                        </defs>
                    </svg>
                </div>
                
                <p class="success-message" data-i18n="register.success.message">
                    Un email de confirmation a été envoyé à votre adresse.
                </p>
                
                <p class="success-submessage" data-i18n="register.success.check">
                    Vérifiez votre boîte de réception et cliquez sur le lien pour activer votre compte.
                </p>
                
                <button class="success-button" onclick="window.location.href='app.html'">
                    <span data-i18n="register.success.button">Aller à la page de connexion</span>
                    <span class="button-arrow">→</span>
                </button>
                
                <div class="success-note">
                    💡 <span>Pensez à vérifier vos spams si vous ne recevez pas l email</span>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Animation d'entrée
        requestAnimationFrame(() => {
            modal.style.opacity = '1';
            modal.querySelector('.success-modal-content').style.transform = 'scale(1)';
        });
    }
}

// === INITIALISATION ===
document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 DOM chargé, initialisation register.js...');
    
    // Vérifier les dépendances
    if (typeof Utils === 'undefined') {
        console.error('❌ Utils non défini');
        return;
    }

    if (typeof LanguageManager === 'undefined') {
        console.error('❌ LanguageManager non défini');
        return;
    }

    if (typeof TRANSLATIONS === 'undefined') {
        console.error('❌ TRANSLATIONS non défini');
        return;
    }

    if (typeof SUPABASE_CONFIG === 'undefined') {
        console.error('❌ SUPABASE_CONFIG non défini');
        return;
    }

    // Initialiser la page d'inscription
    try {
        window.registerManager = new RegisterManager();
        console.log('✅ RegisterManager créé');
    } catch (error) {
        console.error('❌ Erreur initialisation:', error);
    }
});