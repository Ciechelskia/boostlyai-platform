// ============================================
// PROFILE MANAGER - GESTION DU PROFIL UTILISATEUR
// VERSION AVEC DEBUG MAXIMUM POUR ERREUR 400
// ============================================

class ProfileManager {
    constructor(appManager) {
        this.appManager = appManager;
        this.currentProfile = null;
    }

    // === CHARGEMENT DU PROFIL ===
    
    async loadProfile(userId) {
        if (!userId || !window.supabaseClient) {
            console.warn('⚠️ Impossible de charger le profil');
            return null;
        }

        try {
            const { data: profile, error } = await window.supabaseClient
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (error) throw error;

            this.currentProfile = profile;
            this.updateProfileUI(profile);
            
            console.log('✅ Profil chargé:', profile);
            return profile;

        } catch (error) {
            console.error('❌ Erreur chargement profil:', error);
            return null;
        }
    }

    // === MISE À JOUR DE L'INTERFACE PROFIL ===
    
    updateProfileUI(profile) {
        // Informations personnelles
        const firstNameInput = document.getElementById('profileFirstName');
        const lastNameInput = document.getElementById('profileLastName');
        const emailInput = document.getElementById('profileEmail');

        if (firstNameInput) firstNameInput.value = profile.first_name || '';
        if (lastNameInput) lastNameInput.value = profile.last_name || '';
        if (emailInput) emailInput.value = profile.email || '';

        // Badge du plan
        const planBadge = document.getElementById('planBadge');
        if (planBadge) {
            const isPro = profile.subscription_plan === 'pro';
            planBadge.textContent = isPro ? 'PRO' : 'FREE';
            planBadge.className = isPro ? 'plan-badge pro' : 'plan-badge free';
        }

        // Date d'inscription
        const planDate = document.getElementById('planDate');
        if (planDate && profile.created_at) {
            const createdDate = new Date(profile.created_at);
            const monthNames = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
            const formattedDate = `${createdDate.getDate()} ${monthNames[createdDate.getMonth()]} ${createdDate.getFullYear()}`;
            planDate.textContent = `${t('profile.member.since')} ${formattedDate}`;
        }

        // Compteur de rapports
        this.updateReportsCounter(profile);

        // Boutons d'abonnement
        this.updateSubscriptionButtons(profile);

        // Appareils connectés
        this.updateDevicesList(profile);
    }

    // === MISE À JOUR DU COMPTEUR DE RAPPORTS ===
    
    updateReportsCounter(profile) {
        const isPro = profile.subscription_plan === 'pro';
        const count = profile.reports_this_month || 0;
        const limit = isPro ? '∞' : '5';

        const countElement = document.getElementById('reportsCountProfile');
        const limitElement = document.getElementById('reportsLimitProfile');
        const progressBar = document.getElementById('reportsProgressBar');

        if (countElement) countElement.textContent = count;
        if (limitElement) limitElement.textContent = limit;

        if (progressBar) {
            if (isPro) {
                progressBar.style.width = '100%';
                progressBar.style.background = 'linear-gradient(90deg, #10b981, #059669)';
            } else {
                const percentage = Math.min((count / 5) * 100, 100);
                progressBar.style.width = percentage + '%';
                
                if (percentage >= 100) {
                    progressBar.style.background = 'linear-gradient(90deg, #ef4444, #dc2626)';
                } else if (percentage >= 80) {
                    progressBar.style.background = 'linear-gradient(90deg, #f59e0b, #d97706)';
                } else {
                    progressBar.style.background = 'linear-gradient(90deg, #8B1538, #F59E0B)';
                }
            }
        }

        // ✅ AFFICHAGE DE LA DATE DU PROCHAIN RESET (pour FREE uniquement)
        const nextResetInfo = document.getElementById('nextResetInfo');
        if (nextResetInfo && !isPro) {
            const nextReset = this.getNextResetDate();
            const daysUntilReset = this.getDaysUntilReset();
            
            nextResetInfo.innerHTML = `
                <div style="
                    margin-top: 15px;
                    padding: 12px;
                    background: linear-gradient(135deg, rgba(139, 21, 56, 0.05), rgba(245, 158, 11, 0.05));
                    border-left: 3px solid var(--primary);
                    border-radius: 8px;
                    font-size: 13px;
                    color: var(--gray-700);
                ">
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                        <span style="font-size: 16px;">🔄</span>
                        <strong>Prochain reset :</strong>
                    </div>
                    <div style="color: var(--gray-600); margin-left: 24px;">
                        ${nextReset} (dans ${daysUntilReset} jour${daysUntilReset > 1 ? 's' : ''})
                    </div>
                </div>
            `;
        } else if (nextResetInfo) {
            nextResetInfo.innerHTML = '';
        }
    }

    // === CALCUL DE LA DATE DU PROCHAIN RESET ===
    
    getNextResetDate() {
        if (!this.currentProfile || !this.currentProfile.billing_cycle_day) {
            return '1er du mois prochain';
        }

        const billingDay = this.currentProfile.billing_cycle_day;
        const today = new Date();
        const currentDay = today.getDate();

        // Date du prochain reset
        let nextReset = new Date(today.getFullYear(), today.getMonth(), billingDay);

        // Si le jour est déjà passé ce mois, passer au mois suivant
        if (currentDay >= billingDay) {
            nextReset = new Date(today.getFullYear(), today.getMonth() + 1, billingDay);
        }

        // Gérer les mois courts (février avec 28/29 jours)
        const maxDayInMonth = new Date(nextReset.getFullYear(), nextReset.getMonth() + 1, 0).getDate();
        if (billingDay > maxDayInMonth) {
            nextReset.setDate(maxDayInMonth);
        }

        const monthNames = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
        const day = nextReset.getDate();
        const dayStr = day === 1 ? '1er' : day.toString();
        
        return `${dayStr} ${monthNames[nextReset.getMonth()]} ${nextReset.getFullYear()}`;
    }

    getDaysUntilReset() {
        if (!this.currentProfile || !this.currentProfile.billing_cycle_day) {
            return 0;
        }

        const billingDay = this.currentProfile.billing_cycle_day;
        const today = new Date();
        const currentDay = today.getDate();

        // Date du prochain reset
        let nextReset = new Date(today.getFullYear(), today.getMonth(), billingDay);

        // Si le jour est déjà passé ce mois, passer au mois suivant
        if (currentDay >= billingDay) {
            nextReset = new Date(today.getFullYear(), today.getMonth() + 1, billingDay);
        }

        // Gérer les mois courts
        const maxDayInMonth = new Date(nextReset.getFullYear(), nextReset.getMonth() + 1, 0).getDate();
        if (billingDay > maxDayInMonth) {
            nextReset.setDate(maxDayInMonth);
        }

        // Calculer la différence en jours
        const diffTime = nextReset - today;
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    // === MISE À JOUR DES BOUTONS D'ABONNEMENT ===
    
    updateSubscriptionButtons(profile) {
        const upgradeBtn = document.getElementById('upgradeBtn');
        const cancelBtn = document.getElementById('cancelSubscriptionBtn');

        const isPro = profile.subscription_plan === 'pro';
        const isCanceling = profile.subscription_status === 'canceling';

        if (upgradeBtn) {
            upgradeBtn.style.display = isPro ? 'none' : 'flex';
        }

        if (cancelBtn) {
            // ✅ CORRECTION : Masquer le bouton si déjà en cours d'annulation
            if (isCanceling) {
                cancelBtn.style.display = 'none';
            } else {
                cancelBtn.style.display = isPro ? 'flex' : 'none';
            }
        }

        // ✅ CORRECTION : Utiliser subscription_end_date (qui existe dans la DB)
        if (isPro && isCanceling && profile.subscription_end_date) {
            const planDate = document.getElementById('planDate');
            if (planDate) {
                const cancelDate = new Date(profile.subscription_end_date);
                const formattedDate = cancelDate.toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                });

                planDate.innerHTML = `
                    <div style="color: var(--warning); font-weight: 600; margin-bottom: 10px;">
                        ⚠️ Annulation programmée
                    </div>
                    <div style="font-size: 14px; color: var(--gray-600);">
                        Votre abonnement prendra fin le <strong>${formattedDate}</strong>
                    </div>
                    <div style="font-size: 13px; color: var(--gray-500); margin-top: 5px;">
                        Vous conservez l'accès PRO jusqu'à cette date
                    </div>
                `;
            }
        }
    }

    // === MISE À JOUR DE LA LISTE DES APPAREILS ===
    
    updateDevicesList(profile) {
        const devicesList = document.getElementById('devicesList');
        if (!devicesList) return;

        // ✅ CORRECTION : Utiliser device_ids au lieu de devices
        const devices = profile.device_ids || [];
        const isPro = profile.subscription_plan === 'pro';

        console.log('📱 Appareils trouvés:', devices.length);
        console.log('📱 Devices:', devices);

        // ✅ Message informatif : 2 appareils MAX pour TOUS
        let limitInfo = `
            <div style="
                margin-bottom: 15px;
                padding: 12px;
                background: linear-gradient(135deg, rgba(139, 21, 56, 0.05), rgba(245, 158, 11, 0.05));
                border-left: 3px solid var(--primary);
                border-radius: 8px;
                font-size: 13px;
                color: var(--gray-700);
            ">
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                    <span style="font-size: 16px;">📱</span>
                    <strong>Appareils connectés : ${devices.length}/2</strong>
                </div>
                <div style="color: var(--gray-600); margin-left: 24px;">
                    Maximum 2 appareils connectés
                </div>
                ${devices.length >= 2 ? `
                    <div style="
                        margin-top: 12px;
                        padding: 10px;
                        background: rgba(245, 158, 11, 0.1);
                        border-radius: 6px;
                        font-size: 12px;
                        color: var(--gray-700);
                    ">
                        ⚠️ <strong>Limite atteinte :</strong> Pour vous connecter sur un nouvel appareil, contactez notre service client qui déconnectera un de vos appareils actuels.
                    </div>
                ` : ''}
            </div>
        `;

        if (devices.length === 0) {
            devicesList.innerHTML = `
                ${limitInfo}
                <p style="color: var(--gray-500); font-size: 14px; text-align: center; padding: 20px;">
                    Aucun appareil connecté
                </p>
            `;
            return;
        }

        devicesList.innerHTML = `
            ${limitInfo}
            ${devices.map((device, index) => {
                // ✅ Utiliser le nom de l'appareil s'il existe, sinon fallback
                const deviceName = device.device_name || `Appareil ${index + 1}`;
                const browserInfo = device.browser ? ` · ${device.browser}` : '';
                const isCurrentDevice = device.device_id === Utils.generateDeviceId();
                
                return `
                <div style="
                    padding: 15px;
                    background: ${isCurrentDevice ? 'linear-gradient(135deg, rgba(139, 21, 56, 0.05), rgba(245, 158, 11, 0.05))' : 'var(--gray-50)'};
                    border-radius: 10px;
                    margin-bottom: 10px;
                    border: ${isCurrentDevice ? '2px solid var(--primary)' : '1px solid var(--gray-200)'};
                ">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div style="flex: 1;">
                            <div style="font-weight: 600; color: var(--gray-800); margin-bottom: 5px; display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                                ${deviceName}${browserInfo}
                                ${isCurrentDevice ? '<span style="background: var(--primary); color: white; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 700;">CET APPAREIL</span>' : ''}
                            </div>
                            <div style="font-size: 12px; color: var(--gray-500);">
                                Connecté le ${new Date(device.connected_at || Date.now()).toLocaleDateString('fr-FR', {
                                    day: 'numeric',
                                    month: 'long',
                                    year: 'numeric'
                                })}
                            </div>
                        </div>
                        ${isCurrentDevice ? `
                            <div style="
                                width: 10px;
                                height: 10px;
                                background: #10b981;
                                border-radius: 50%;
                                margin-left: 15px;
                            "></div>
                        ` : ''}
                    </div>
                </div>
            `}).join('')}
            
            <div style="
                margin-top: 20px;
                padding: 15px;
                background: linear-gradient(135deg, rgba(139, 21, 56, 0.03), rgba(245, 158, 11, 0.03));
                border-radius: 10px;
                font-size: 13px;
                color: var(--gray-600);
                text-align: center;
            ">
                💬 <strong>Besoin de changer d'appareil ?</strong><br>
                Contactez notre service client : <a href="mailto:support@vocalia.fr" style="color: var(--primary); font-weight: 600;">support@vocalia.fr</a>
            </div>
        `;
    }

    // ✅ RETIRER LA FONCTION disconnectDevice (plus nécessaire)
    // Les utilisateurs ne peuvent plus déconnecter eux-mêmes

    // === SAUVEGARDE DU PROFIL ===
    
    async saveProfile() {
        const firstNameInput = document.getElementById('profileFirstName');
        const lastNameInput = document.getElementById('profileLastName');

        const firstName = firstNameInput?.value.trim();
        const lastName = lastNameInput?.value.trim();

        if (!firstName || !lastName) {
            Utils.showToast('Veuillez remplir tous les champs', 'error');
            return;
        }

        const currentUser = this.appManager.getCurrentUser();
        if (!currentUser || !currentUser.id) {
            Utils.showToast('Utilisateur non connecté', 'error');
            return;
        }

        try {
            const { error } = await window.supabaseClient
                .from('profiles')
                .update({
                    first_name: firstName,
                    last_name: lastName
                })
                .eq('id', currentUser.id);

            if (error) throw error;

            // Mise à jour du nom affiché dans le header
            const userNameElement = document.getElementById('userName');
            if (userNameElement) {
                userNameElement.textContent = `${firstName} ${lastName}`;
            }

            Utils.showToast('✅ Profil sauvegardé avec succès', 'success');
            
            // Recharger le profil
            await this.loadProfile(currentUser.id);

        } catch (error) {
            console.error('❌ Erreur sauvegarde profil:', error);
            Utils.showToast('Erreur lors de la sauvegarde', 'error');
        }
    }

    // === GESTION DE L'UPGRADE - VERSION CORRIGÉE ===
    
    async handleUpgrade() {
        const currentUser = this.appManager.getCurrentUser();
        if (!currentUser || !currentUser.id) {
            Utils.showToast('Utilisateur non connecté', 'error');
            return;
        }

        try {
            console.log('========== DÉBUT CRÉATION SESSION STRIPE ==========');
            console.log('🚀 Création de la session Stripe...');
            
            // ✅ Utiliser window.STRIPE_CONFIG (chargé depuis stripe-config.js)
            const config = window.STRIPE_CONFIG;
            
            if (!config) {
                throw new Error('❌ STRIPE_CONFIG non chargé. Vérifiez que stripe-config.js est bien chargé.');
            }
            
            const priceId = config.PRICE_ID || config.priceId;
            const successUrl = config.successUrl;
            const cancelUrl = config.cancelUrl;
            
            console.log('📊 Config Stripe:', {
                priceId: priceId,
                successUrl: successUrl,
                cancelUrl: cancelUrl
            });
            
            console.log('📊 Données envoyées:', {
                userId: currentUser.id,
                priceId: priceId,
                successUrl: successUrl,
                cancelUrl: cancelUrl
            });

            // Appel à la fonction Edge
            const response = await window.supabaseClient.functions.invoke('create-checkout-session', {
                body: { 
                    userId: currentUser.id,
                    priceId: priceId,
                    successUrl: successUrl,
                    cancelUrl: cancelUrl
                }
            });

            console.log('========== RÉPONSE EDGE FUNCTION ==========');
            console.log('📦 Réponse COMPLÈTE:', response);
            console.log('📦 response.data:', response.data);
            console.log('📦 response.error:', response.error);

            // Si erreur dans response.error
            if (response.error) {
                console.error('========== ERREUR DÉTECTÉE ==========');
                console.error('❌ response.error:', response.error);
                throw response.error;
            }

            // Si erreur dans response.data
            if (response.data && response.data.error) {
                console.error('========== ERREUR DANS DATA ==========');
                console.error('❌ response.data.error:', response.data.error);
                throw new Error(response.data.error);
            }

            // ✅ UTILISER L'URL retournée par Stripe (pas construire manuellement)
            if (!response.data || !response.data.url) {
                console.error('========== PAS D\'URL STRIPE ==========');
                console.error('❌ response.data:', response.data);
                throw new Error('URL Stripe non reçue');
            }

            // Succès !
            console.log('========== SUCCÈS ==========');
            console.log('✅ Session ID:', response.data.sessionId);
            console.log('✅ URL Stripe:', response.data.url);
            console.log('✅ Redirection vers Stripe Checkout...');
            window.location.href = response.data.url;

        } catch (error) {
            console.error('========== ERREUR CATCH ==========');
            console.error('❌ Erreur création session Stripe:', error);
            console.error('❌ Type d\'erreur:', error.constructor.name);
            console.error('❌ Message:', error.message);
            console.error('❌ Stack:', error.stack);
            console.error('❌ Toutes les propriétés:', Object.keys(error));
            console.error('❌ JSON.stringify:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
            
            // Message d'erreur pour l'utilisateur
            let errorMessage = 'Erreur lors de la création de la session de paiement';
            
            if (error.message) {
                errorMessage += `: ${error.message}`;
            }
            
            Utils.showToast(errorMessage, 'error', 5000);
        }
    }

    // === ANNULATION DE L'ABONNEMENT ===
    
    async cancelSubscription() {
        const confirmMessage = t('profile.cancel.confirm');
        
        if (!confirm(confirmMessage)) {
            return;
        }

        const currentUser = this.appManager.getCurrentUser();
        if (!currentUser || !currentUser.id) {
            Utils.showToast('Utilisateur non connecté', 'error');
            return;
        }

        try {
            console.log('🚫 Annulation de l\'abonnement...');

            const { data, error } = await window.supabaseClient.functions.invoke('cancel-subscription', {
                body: { userId: currentUser.id }
            });

            if (error) throw error;

            if (data && data.success) {
                const cancelDate = new Date(data.cancel_at * 1000).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                });

                Utils.showToast(
                    `${t('profile.cancel.success')} ${cancelDate}`,
                    'success',
                    5000
                );

                // Recharger le profil pour mettre à jour l'UI
                await this.loadProfile(currentUser.id);

            } else {
                throw new Error('Réponse invalide du serveur');
            }

        } catch (error) {
            console.error('❌ Erreur annulation abonnement:', error);
            Utils.showToast(t('profile.cancel.error'), 'error');
        }
    }

    // === SUPPRESSION DU COMPTE ===
    
    async deleteAccount() {
        const confirmMessage = `⚠️ ATTENTION ⚠️

Êtes-vous ABSOLUMENT SÛR de vouloir supprimer votre compte ?

Cette action est DÉFINITIVE et IRRÉVERSIBLE :
- Tous vos rapports seront supprimés
- Tous vos brouillons seront supprimés
- Tous vos dossiers seront supprimés
- Votre abonnement sera annulé
- Toutes vos données seront effacées

Tapez "SUPPRIMER" pour confirmer :`;

        const userInput = prompt(confirmMessage);

        if (userInput !== 'SUPPRIMER') {
            Utils.showToast('Suppression annulée', 'info');
            return;
        }

        const currentUser = this.appManager.getCurrentUser();
        if (!currentUser || !currentUser.id) {
            Utils.showToast('Utilisateur non connecté', 'error');
            return;
        }

        try {
            console.log('🗑️ Suppression du compte...');

            // Suppression de tous les rapports
            await window.supabaseClient
                .from('reports')
                .delete()
                .eq('user_id', currentUser.id);

            // Suppression de tous les brouillons
            await window.supabaseClient
                .from('drafts')
                .delete()
                .eq('user_id', currentUser.id);

            // Suppression de tous les dossiers
            await window.supabaseClient
                .from('folders')
                .delete()
                .eq('user_id', currentUser.id);

            // Suppression du profil
            const { error: profileError } = await window.supabaseClient
                .from('profiles')
                .delete()
                .eq('id', currentUser.id);

            if (profileError) throw profileError;

            // Suppression de l'utilisateur Auth
            const { error: authError } = await window.supabaseClient.auth.admin.deleteUser(
                currentUser.id
            );

            if (authError) {
                console.warn('⚠️ Erreur suppression Auth (normal si pas admin):', authError);
            }

            Utils.showToast('✅ Compte supprimé avec succès', 'success');

            // Déconnexion et redirection
            setTimeout(() => {
                this.appManager.logout();
            }, 2000);

        } catch (error) {
            console.error('❌ Erreur suppression compte:', error);
            Utils.showToast('Erreur lors de la suppression du compte', 'error');
        }
    }

    // === VÉRIFICATION DU STATUT PRO ===
    
    async checkProStatus() {
        if (!this.currentProfile) {
            const currentUser = this.appManager.getCurrentUser();
            if (currentUser && currentUser.id) {
                await this.loadProfile(currentUser.id);
            }
        }

        return this.currentProfile?.subscription_plan === 'pro';
    }

    // === OBTENIR LE PROFIL ACTUEL ===
    
    getCurrentProfile() {
        return this.currentProfile;
    }
}