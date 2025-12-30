// ============================================
// DATA MANAGER - VERSION SUPABASE COMPLÈTE
// CORRIGÉ : id + folder_id en TEXT + devices → device_ids
// ============================================

class DataManager {
    constructor() {
        this.storageKey = 'rapportsApp';
        this.maxBrouillons = 10;
        this.maxRapports = 20;
        this.currentFolderId = null;
        this.syncInProgress = false;
    }

    // === VÉRIFIER SI ON PEUT UTILISER SUPABASE ===
    
    canUseSupabase() {
        const currentUser = window.appManager?.getCurrentUser();
        return !!(currentUser && currentUser.id && window.supabaseClient);
    }

    getUserId() {
        const currentUser = window.appManager?.getCurrentUser();
        return currentUser?.id || null;
    }

    // === SYNCHRONISATION INITIALE AU LOGIN ===
    
    async syncFromSupabase() {
        if (!this.canUseSupabase() || this.syncInProgress) return;
        
        this.syncInProgress = true;
        console.log('🔄 Synchronisation depuis Supabase...');
        
        try {
            const userId = this.getUserId();
            
            const [draftsResult, reportsResult, foldersResult] = await Promise.all([
                window.supabaseClient.from('drafts').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
                window.supabaseClient.from('reports').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
                window.supabaseClient.from('folders').select('*').eq('user_id', userId).order('created_at', { ascending: false })
            ]);
            
            if (draftsResult.error) throw draftsResult.error;
            if (reportsResult.error) throw reportsResult.error;
            if (foldersResult.error) throw foldersResult.error;
            
            const data = {
                brouillons: (draftsResult.data || []).map(d => this.convertDraftFromSupabase(d)),
                rapports: (reportsResult.data || []).map(r => this.convertReportFromSupabase(r)),
                folders: (foldersResult.data || []).map(f => this.convertFolderFromSupabase(f)),
                lastSaved: new Date().toISOString()
            };
            
            this.saveAppData(data);
            
            console.log('✅ Synchronisation terminée:', {
                brouillons: data.brouillons.length,
                rapports: data.rapports.length,
                folders: data.folders.length
            });
            
            return data;
            
        } catch (error) {
            console.error('❌ Erreur synchronisation:', error);
            Utils.showToast('Erreur de synchronisation. Mode hors ligne activé.', 'warning');
            return this.loadAppData();
        } finally {
            this.syncInProgress = false;
        }
    }

    // === CONVERSION SUPABASE → LOCAL ===
    
    convertDraftFromSupabase(draft) {
        return {
            id: draft.id,
            title: draft.title || t('new.report'),
            generatedReport: draft.generated_report,
            createdAt: draft.created_at,
            sourceType: draft.source_type || 'recording',
            sourceInfo: draft.source_info,
            audioUrl: draft.audio_url,
            status: draft.status || 'generating',
            isModified: draft.is_modified || false
        };
    }
    
    convertReportFromSupabase(report) {
        return {
            id: report.id,
            title: report.title,
            content: report.content,
            validatedAt: report.validated_at || report.created_at,
            createdAt: report.created_at,
            folderId: report.folder_id,
            status: report.status,
            sourceType: report.source_type,
            sourceInfo: report.source_info,
            isModified: report.is_modified || false,
            hasPdf: report.has_pdf || false,
            pdfGenerated: report.pdf_generated || false,
            pdfUrl: report.pdf_url,
            isTranslation: report.is_translation || false,
            originalReportId: report.original_report_id,
            translatedTo: report.translated_to,
            detectedLanguage: report.detected_language,
            translatedAt: report.translated_at,
            sharedWith: report.shared_with || []
        };
    }
    
    convertFolderFromSupabase(folder) {
        return {
            id: folder.id.toString(),
            name: folder.name,
            color: folder.color || '#8B1538',
            createdAt: folder.created_at
        };
    }

    // === CONVERSION LOCAL → SUPABASE ===
    
    convertDraftToSupabase(draft) {
        const userId = this.getUserId();
        return {
            id: draft.id,
            user_id: userId,
            title: draft.title,
            generated_report: draft.generatedReport,
            created_at: draft.createdAt || new Date().toISOString(),
            source_type: draft.sourceType || 'recording',
            source_info: draft.sourceInfo,
            audio_url: draft.audioUrl,
            status: draft.status || 'generating',
            is_modified: draft.isModified || false
        };
    }
    
    convertReportToSupabase(report) {
        const userId = this.getUserId();
        return {
            id: report.id,  // ✅ CORRECTION CRITIQUE : Envoyer l'ID
            user_id: userId,
            title: report.title,
            content: report.content,
            validated_at: report.validatedAt || new Date().toISOString(),
            created_at: report.createdAt || new Date().toISOString(),
            folder_id: report.folderId || null,  // ✅ CORRECTION : TEXT, pas parseInt
            status: 'validated',
            source_type: report.sourceType || 'recording',
            source_info: report.sourceInfo,
            is_modified: report.isModified || false,
            has_pdf: report.hasPdf || false,
            pdf_generated: report.pdfGenerated || false,
            pdf_url: report.pdfUrl || null,
            is_translation: report.isTranslation || false,
            original_report_id: report.originalReportId || null,
            translated_to: report.translatedTo || null,
            detected_language: report.detectedLanguage || null,
            translated_at: report.translatedAt || null,
            shared_with: report.sharedWith || []
        };
    }
    
    convertFolderToSupabase(folder) {
        const userId = this.getUserId();
        return {
            user_id: userId,
            name: folder.name,
            color: folder.color || '#8B1538',
            created_at: folder.createdAt || new Date().toISOString()
        };
    }

    // === UPLOAD PDF VERS SUPABASE STORAGE ===
    
    async uploadPdfToStorage(pdfData, filename) {
        if (!this.canUseSupabase()) {
            console.warn('⚠️ Supabase non disponible, PDF stocké en localStorage');
            return null;
        }
        
        try {
            console.log('📤 Upload PDF vers Supabase Storage...');
            
            const base64Data = pdfData.includes('base64,') 
                ? pdfData.split('base64,')[1] 
                : pdfData;
            
            const byteCharacters = atob(base64Data);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: 'application/pdf' });
            
            const userId = this.getUserId();
            const timestamp = Date.now();
            const safeName = filename.replace(/[^a-z0-9_-]/gi, '_');
            const filePath = `${userId}/${timestamp}_${safeName}.pdf`;
            
            const { data, error } = await window.supabaseClient.storage
                .from('vocalia-files')
                .upload(filePath, blob, {
                    contentType: 'application/pdf',
                    cacheControl: '3600',
                    upsert: false
                });
            
            if (error) throw error;
            
            const { data: urlData } = await window.supabaseClient.storage
                .from('vocalia-files')
                .createSignedUrl(filePath, 31536000);
            
            console.log('✅ PDF uploadé:', urlData.signedUrl);
            return urlData.signedUrl;
            
        } catch (error) {
            console.error('❌ Erreur upload PDF:', error);
            return null;
        }
    }

    // === GESTION DU STOCKAGE ===

    loadAppData() {
        try {
            const saved = localStorage.getItem(this.storageKey);
            if (saved) {
                const data = JSON.parse(saved);
                return {
                    brouillons: data.brouillons || [],
                    rapports: data.rapports || [],
                    folders: data.folders || []
                };
            }
        } catch (error) {
            console.error('Erreur lecture localStorage:', error);
        }
        return { brouillons: [], rapports: [], folders: [] };
    }

    saveAppData(data) {
        try {
            const dataToSave = {
                ...data,
                lastSaved: new Date().toISOString()
            };
            localStorage.setItem(this.storageKey, JSON.stringify(dataToSave));
        } catch (error) {
            console.error('Erreur sauvegarde localStorage:', error);
            
            if (error.name === 'QuotaExceededError') {
                console.log('Tentative de nettoyage automatique...');
                this.cleanOldData(data);
            }
        }
    }

    cleanOldData(data) {
        try {
            const cleaned = {
                brouillons: data.brouillons ? data.brouillons.slice(0, this.maxBrouillons) : [],
                rapports: data.rapports ? data.rapports.slice(0, this.maxRapports) : [],
                folders: data.folders || [],
                lastSaved: new Date().toISOString()
            };
            
            localStorage.setItem(this.storageKey, JSON.stringify(cleaned));
            console.log('Nettoyage automatique effectué');
            Utils.showToast(t('toast.users.updated'), 'info');
        } catch (error) {
            console.error('Erreur lors du nettoyage:', error);
        }
    }

    // === GESTION DES BROUILLONS ===

    getBrouillons() {
        const data = this.loadAppData();
        return data.brouillons || [];
    }

    async addBrouillon(brouillon) {
        const data = this.loadAppData();
        data.brouillons = data.brouillons || [];
        data.brouillons.unshift(brouillon);
        
        this.saveAppData(data);
        this.updateBrouillonsUI(data.brouillons);
        
        if (this.canUseSupabase()) {
            try {
                const supabaseDraft = this.convertDraftToSupabase(brouillon);
                const { error } = await window.supabaseClient
                    .from('drafts')
                    .insert([supabaseDraft]);
                
                if (error) throw error;
                console.log('✅ Brouillon sauvegardé dans Supabase');
            } catch (error) {
                console.error('❌ Erreur sauvegarde brouillon Supabase:', error);
            }
        }
    }

    async updateBrouillonWithReport(brouillonId, reportContent) {
        const data = this.loadAppData();
        const brouillon = data.brouillons.find(b => b.id === brouillonId);
        
        if (brouillon) {
            brouillon.generatedReport = reportContent;
            brouillon.status = 'ready';
            brouillon.title = this.extractTitleFromContent(reportContent);
            
            this.saveAppData(data);
            this.updateBrouillonsUI(data.brouillons);
            
            if (this.canUseSupabase()) {
                try {
                    const { error } = await window.supabaseClient
                        .from('drafts')
                        .update({
                            generated_report: reportContent,
                            status: 'ready',
                            title: brouillon.title
                        })
                        .eq('id', brouillonId);
                    
                    if (error) throw error;
                    console.log('✅ Brouillon mis à jour dans Supabase');
                } catch (error) {
                    console.error('❌ Erreur mise à jour brouillon:', error);
                }
            }
        }
    }

    async updateBrouillonStatus(brouillonId, status) {
        const data = this.loadAppData();
        const brouillon = data.brouillons.find(b => b.id === brouillonId);
        
        if (brouillon) {
            brouillon.status = status;
            if (status === 'error') {
                brouillon.title = t('drafts.status.error');
            }
            
            this.saveAppData(data);
            this.updateBrouillonsUI(data.brouillons);
            
            if (this.canUseSupabase()) {
                try {
                    const { error } = await window.supabaseClient
                        .from('drafts')
                        .update({ status, title: brouillon.title })
                        .eq('id', brouillonId);
                    
                    if (error) throw error;
                } catch (error) {
                    console.error('❌ Erreur mise à jour status:', error);
                }
            }
        }
    }

    async deleteBrouillon(brouillonId) {
        const data = this.loadAppData();
        data.brouillons = data.brouillons.filter(b => b.id !== brouillonId);
        
        this.saveAppData(data);
        this.updateBrouillonsUI(data.brouillons);
        Utils.showToast(t('toast.draft.deleted'), 'success');
        
        if (this.canUseSupabase()) {
            try {
                const { error } = await window.supabaseClient
                    .from('drafts')
                    .delete()
                    .eq('id', brouillonId);
                
                if (error) throw error;
                console.log('✅ Brouillon supprimé de Supabase');
            } catch (error) {
                console.error('❌ Erreur suppression brouillon:', error);
            }
        }
    }

    editBrouillon(brouillonId) {
        const data = this.loadAppData();
        const brouillon = data.brouillons.find(b => b.id === brouillonId);
        
        if (brouillon) {
            const modal = Utils.createModal(
                'Éditer le rapport',
                `
                    <label style="display: block; margin-bottom: 10px; font-weight: bold;">
                        Titre du rapport :
                    </label>
                    <input type="text" id="editTitle" class="modal-input" value="${Utils.escapeHtml(brouillon.title || 'Nouveau rapport')}">
                    
                    <label style="display: block; margin-bottom: 10px; font-weight: bold; margin-top: 20px;">
                        Contenu :
                    </label>
                    <textarea id="editContent" class="modal-textarea">${Utils.escapeHtml(brouillon.generatedReport || '')}</textarea>
                `,
                []
            );
            
            const footer = modal.querySelector('.modal-footer');
            footer.innerHTML = '';
            
            const cancelBtn = document.createElement('button');
            cancelBtn.className = 'btn-secondary';
            cancelBtn.textContent = 'Annuler';
            cancelBtn.addEventListener('click', () => {
                console.log('🔴 Édition annulée');
                modal.remove();
            });
            
            const saveBtn = document.createElement('button');
            saveBtn.className = 'btn-primary';
            saveBtn.textContent = '💾 Sauvegarder';
            saveBtn.addEventListener('click', () => {
                console.log('✅ Sauvegarde du brouillon');
                this.saveEditedBrouillon(brouillonId, saveBtn);
            });
            
            footer.appendChild(cancelBtn);
            footer.appendChild(saveBtn);
        }
    }

    async saveEditedBrouillon(brouillonId, buttonElement) {
        const modal = buttonElement.closest('[data-modal]');
        const newTitle = modal.querySelector('#editTitle').value.trim();
        const newContent = modal.querySelector('#editContent').value.trim();
        
        if (!newTitle || !newContent) {
            Utils.showToast('Le titre et le contenu ne peuvent pas être vides', 'error');
            return;
        }
        
        const data = this.loadAppData();
        const brouillon = data.brouillons.find(b => b.id === brouillonId);
        
        if (brouillon) {
            brouillon.title = newTitle;
            brouillon.generatedReport = newContent;
            brouillon.isModified = true;
            
            this.saveAppData(data);
            this.updateBrouillonsUI(data.brouillons);
            
            modal.remove();
            Utils.showToast('Brouillon sauvegardé', 'success');
            
            if (this.canUseSupabase()) {
                try {
                    const { error } = await window.supabaseClient
                        .from('drafts')
                        .update({
                            title: newTitle,
                            generated_report: newContent,
                            is_modified: true
                        })
                        .eq('id', brouillonId);
                    
                    if (error) throw error;
                    console.log('✅ Brouillon édité dans Supabase');
                } catch (error) {
                    console.error('❌ Erreur édition brouillon:', error);
                }
            }
        }
    }

    async validateBrouillon(brouillonId) {
    const data = this.loadAppData();
    const folders = data.folders || [];

    if (folders.length > 0) {
        const foldersOptions = [
            `<option value="">Aucun dossier</option>`,
            ...folders.map(folder => 
                `<option value="${folder.id}">📁 ${Utils.escapeHtml(folder.name)}</option>`
            )
        ].join('');

        const modal = Utils.createModal(
            'Valider le brouillon',
            `
                <p style="margin-bottom: 20px;">Choisissez un dossier pour organiser ce rapport (optionnel)</p>
                <label style="display: block; margin-bottom: 10px; font-weight: bold;">
                    Dossier de destination :
                </label>
                <select id="validateFolderSelect" class="modal-input" style="cursor: pointer;">
                    ${foldersOptions}
                </select>
            `,
            []
        );
        
        const footer = modal.querySelector('.modal-footer');
        footer.innerHTML = '';
        
        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'btn-secondary';
        cancelBtn.textContent = 'Annuler';
        cancelBtn.addEventListener('click', () => {
            console.log('🔴 Validation annulée');
            modal.remove();
        });
        
        const validateBtn = document.createElement('button');
        validateBtn.className = 'btn-primary';
        validateBtn.textContent = '✅ Valider';
        validateBtn.addEventListener('click', () => {
            console.log('✅ Validation confirmée');
            const select = modal.querySelector('#validateFolderSelect');
            const selectedFolderId = select.value || null;
            
            console.log('📂 Dossier sélectionné dans le modal:', selectedFolderId);
            
            modal.remove();
            
            console.log('🚀 Appel de confirmValidateBrouillon avec ID:', brouillonId);
            this.confirmValidateBrouillon(brouillonId, selectedFolderId);
        });
        
        footer.appendChild(cancelBtn);
        footer.appendChild(validateBtn);
        
    } else {
        console.log('📁 Aucun dossier disponible, validation directe');
        this.confirmValidateBrouillon(brouillonId);
    }
}

async confirmValidateBrouillon(brouillonId, selectedFolderId = null) {
    const data = this.loadAppData();
    const brouillonIndex = data.brouillons.findIndex(b => b.id === brouillonId);
    
    if (brouillonIndex !== -1) {
        const brouillon = data.brouillons[brouillonIndex];
        
        const rapport = {
            id: Utils.generateId('rapport_'),
            title: brouillon.title || `Nouveau rapport - ${new Date().toLocaleDateString()}`,
            content: brouillon.generatedReport,
            validatedAt: new Date().toISOString(),
            createdAt: brouillon.createdAt,
            folderId: selectedFolderId,
            sharedWith: [],
            status: 'validated',
            isModified: brouillon.isModified,
            sourceType: brouillon.sourceType,
            sourceInfo: brouillon.sourceInfo,
            hasPdf: false,
            pdfGenerated: false,
            pdfUrl: null
        };

        console.log('🔵 ========== DÉBUT VALIDATION BROUILLON ==========');
        console.log('📄 Rapport LOCAL créé:', rapport);
        console.log('📂 Dossier sélectionné (folderId):', selectedFolderId);
        console.log('🆔 ID du rapport:', rapport.id);

        try {
            Utils.showToast('Génération du PDF...', 'info');
            const pdf = await Utils.generatePDF(rapport.title, rapport.content);
            
            if (this.canUseSupabase()) {
                const pdfUrl = await this.uploadPdfToStorage(
                    pdf.output('datauristring'), 
                    rapport.title
                );
                
                if (pdfUrl) {
                    rapport.pdfUrl = pdfUrl;
                    rapport.hasPdf = true;
                    rapport.pdfGenerated = true;
                    console.log('✅ PDF uploadé vers Supabase Storage');
                } else {
                    rapport.pdfData = pdf.output('datauristring');
                    rapport.hasPdf = true;
                    rapport.pdfGenerated = true;
                }
            } else {
                rapport.pdfData = pdf.output('datauristring');
                rapport.hasPdf = true;
                rapport.pdfGenerated = true;
            }
            
            Utils.showToast('PDF généré avec succès', 'success');
        } catch (error) {
            console.error('Erreur génération PDF:', error);
            Utils.showToast('Erreur lors de la génération du PDF', 'error');
        }

        data.rapports = data.rapports || [];
        data.rapports.unshift(rapport);
        data.brouillons.splice(brouillonIndex, 1);
        
        this.saveAppData(data);
        this.updateBrouillonsUI(data.brouillons);
        this.updateRapportsUI(data.rapports);
        
        Utils.showToast('Rapport validé avec succès', 'success');
        
        if (this.canUseSupabase()) {
            try {
                const userId = this.getUserId();
                const currentUser = window.appManager?.getCurrentUser();
                
                console.log('🔄 Conversion rapport pour Supabase...');
                const supabaseReport = this.convertReportToSupabase(rapport);
                
                console.log('📤 Rapport CONVERTI pour Supabase:', supabaseReport);
                console.log('🔍 Vérifications:');
                console.log('   - id:', supabaseReport.id, '(type:', typeof supabaseReport.id, ')');
                console.log('   - folder_id:', supabaseReport.folder_id, '(type:', typeof supabaseReport.folder_id, ')');
                console.log('   - user_id:', supabaseReport.user_id, '(type:', typeof supabaseReport.user_id, ')');
                
                console.log('🚀 Appel Supabase INSERT...');
                const { data: insertedReport, error: reportError } = await window.supabaseClient
                    .from('reports')
                    .insert([supabaseReport])
                    .select()
                    .single();
                
                console.log('📬 Résultat INSERT Supabase:', {
                    data: insertedReport,
                    error: reportError
                });
                
                if (reportError) {
                    console.error('❌❌❌ ERREUR INSERT:', reportError);
                    console.error('Code:', reportError.code);
                    console.error('Message:', reportError.message);
                    console.error('Details:', reportError.details);
                    throw reportError;
                }
                
                console.log('✅✅✅ Rapport sauvegardé dans Supabase:', insertedReport.id);
                
                await window.supabaseClient
                    .from('drafts')
                    .delete()
                    .eq('id', brouillonId);
                
                if (currentUser && currentUser.subscription_plan === 'free') {
                    const { data: profileData, error: fetchError } = await window.supabaseClient
                        .from('profiles')
                        .select('reports_this_month')
                        .eq('id', userId)
                        .single();
                    
                    if (!fetchError) {
                        const newCount = (profileData.reports_this_month || 0) + 1;
                        
                        await window.supabaseClient
                            .from('profiles')
                            .update({ reports_this_month: newCount })
                            .eq('id', userId);
                        
                        console.log(`✅ Compteur mis à jour: ${newCount}/5`);
                        
                        if (window.appManager?.profileManager) {
                            await window.appManager.profileManager.loadProfile(userId);
                        }
                    }
                }
            } catch (error) {
                console.error('❌ Erreur sauvegarde rapport Supabase:', error);
            }
        } else {
            console.warn('⚠️ Supabase non disponible - Sauvegarde locale uniquement');
        }
        
        console.log('🔵 ========== FIN VALIDATION BROUILLON ==========');
    }
}

    // === GESTION DES RAPPORTS ===

    getRapports() {
        const data = this.loadAppData();
        return data.rapports || [];
    }

    // === GESTION DES DOSSIERS ===

    getFolders() {
        const data = this.loadAppData();
        return data.folders || [];
    }

    async createFolder(folderName) {
        if (!folderName || !folderName.trim()) {
            Utils.showToast('Le nom du dossier ne peut pas être vide', 'error');
            return null;
        }

        console.log('🔍 Vérification du plan pour création de dossier...');
        
        const userPlan = await Utils.checkUserPlan();
        
        console.log('📊 Plan utilisateur:', userPlan);
        
        if (userPlan !== 'pro') {
            console.log('🚫 BLOCAGE - Plan FREE: Dossiers réservés au PRO');
            
            Utils.showUpgradeModal(
                '📂 Dossiers réservés au plan PRO',
                'Organisez vos rapports dans des <strong>dossiers illimités</strong> avec le plan PRO.',
                'folders'
            );
            
            return null;
        }
        
        console.log('✅ Plan PRO confirmé - Création de dossier autorisée');

        const data = this.loadAppData();
        data.folders = data.folders || [];

        if (data.folders.find(f => f.name.toLowerCase() === folderName.toLowerCase())) {
            Utils.showToast('Un dossier avec ce nom existe déjà', 'error');
            return null;
        }

        const folder = {
            id: Utils.generateId('folder_'),
            name: folderName.trim(),
            createdAt: new Date().toISOString(),
            color: this.getRandomFolderColor()
        };

        data.folders.push(folder);
        this.saveAppData(data);
        
        Utils.showToast(`Dossier "${folderName}" créé`, 'success');
        
        if (this.canUseSupabase()) {
            try {
                const supabaseFolder = this.convertFolderToSupabase(folder);
                const { data: insertedFolder, error } = await window.supabaseClient
                    .from('folders')
                    .insert([supabaseFolder])
                    .select()
                    .single();
                
                if (error) throw error;
                
                folder.id = insertedFolder.id.toString();
                data.folders[data.folders.length - 1] = folder;
                this.saveAppData(data);
                
                console.log('✅ Dossier sauvegardé dans Supabase:', insertedFolder.id);
            } catch (error) {
                console.error('❌ Erreur création dossier Supabase:', error);
            }
        }
        
        return folder;
    }

    async deleteFolder(folderId) {
        if (!confirm('Êtes-vous sûr de vouloir supprimer ce dossier ? Les rapports seront déplacés vers "Aucun dossier".')) {
            return;
        }

        const data = this.loadAppData();
        
        if (data.rapports) {
            data.rapports.forEach(rapport => {
                if (rapport.folderId === folderId) {
                    rapport.folderId = null;
                }
            });
        }

        data.folders = data.folders.filter(f => f.id !== folderId);
        this.saveAppData(data);
        
        if (this.currentFolderId === folderId) {
            this.closeFolder();
        } else {
            this.updateRapportsUI(data.rapports);
        }
        
        Utils.showToast('Dossier supprimé', 'success');
        
        if (this.canUseSupabase()) {
            try {
                await window.supabaseClient
                    .from('reports')
                    .update({ folder_id: null })
                    .eq('folder_id', folderId);
                
                const { error } = await window.supabaseClient
                    .from('folders')
                    .delete()
                    .eq('id', parseInt(folderId));
                
                if (error) throw error;
                console.log('✅ Dossier supprimé de Supabase');
            } catch (error) {
                console.error('❌ Erreur suppression dossier:', error);
            }
        }
    }

    getRandomFolderColor() {
        const colors = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    getReportsCountText(count) {
        if (count === 0) {
            return '0 rapport';
        } else if (count === 1) {
            return '1 rapport';
        } else {
            return `${count} rapports`;
        }
    }

    openFolder(folderId) {
        this.currentFolderId = folderId;
        const data = this.loadAppData();
        this.updateRapportsUI(data.rapports);
    }

    closeFolder() {
        this.currentFolderId = null;
        const data = this.loadAppData();
        this.updateRapportsUI(data.rapports);
    }

    renameFolder(folderId) {
        const data = this.loadAppData();
        const folder = data.folders.find(f => f.id === folderId);
        
        if (!folder) return;

        const modal = Utils.createModal(
            'Renommer le dossier',
            `
                <label style="display: block; margin-bottom: 10px; font-weight: bold;">
                    Nouveau nom :
                </label>
                <input type="text" id="folderNameInput" class="modal-input" value="${Utils.escapeHtml(folder.name)}" placeholder="Nom du dossier">
            `,
            []
        );
        
        const footer = modal.querySelector('.modal-footer');
        footer.innerHTML = '';
        
        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'btn-secondary';
        cancelBtn.textContent = 'Annuler';
        cancelBtn.addEventListener('click', () => {
            console.log('🔴 Renommage annulé');
            modal.remove();
        });
        
        const saveBtn = document.createElement('button');
        saveBtn.className = 'btn-primary';
        saveBtn.textContent = '💾 Sauvegarder';
        saveBtn.addEventListener('click', () => {
            console.log('✅ Renommage confirmé');
            this.saveFolderRename(folderId, saveBtn);
        });
        
        footer.appendChild(cancelBtn);
        footer.appendChild(saveBtn);
    }

    async saveFolderRename(folderId, buttonElement) {
        const modal = buttonElement.closest('[data-modal]');
        const newName = modal.querySelector('#folderNameInput').value.trim();
        
        if (!newName) {
            Utils.showToast('Le nom du dossier ne peut pas être vide', 'error');
            return;
        }

        const data = this.loadAppData();
        const folder = data.folders.find(f => f.id === folderId);
        
        if (folder) {
            folder.name = newName;
            this.saveAppData(data);
            this.updateRapportsUI(data.rapports);
            modal.remove();
            Utils.showToast('Dossier renommé', 'success');
            
            if (this.canUseSupabase()) {
                try {
                    const { error } = await window.supabaseClient
                        .from('folders')
                        .update({ name: newName })
                        .eq('id', parseInt(folderId));
                    
                    if (error) throw error;
                    console.log('✅ Dossier renommé dans Supabase');
                } catch (error) {
                    console.error('❌ Erreur renommage dossier:', error);
                }
            }
        }
    }

    async moveRapportToFolder(rapportId, newFolderId) {
    const data = this.loadAppData();
    const rapport = data.rapports.find(r => r.id === rapportId);
    
    if (rapport) {
        rapport.folderId = newFolderId;
        this.saveAppData(data);
        this.updateRapportsUI(data.rapports);
        
        const folderName = newFolderId ? data.folders.find(f => f.id === newFolderId)?.name : 'Aucun dossier';
        Utils.showToast(`Rapport déplacé vers "${folderName}"`, 'success');
        
        if (this.canUseSupabase()) {
            try {
                console.log('🔵 ===== DÉBUT DÉPLACEMENT =====');
                console.log('📄 Rapport ID:', rapportId);
                console.log('📂 Nouveau dossier ID:', newFolderId);
                
                const { data: updateResult, error } = await window.supabaseClient
                    .from('reports')
                    .update({ folder_id: newFolderId || null })  // ✅ TEXT ou NULL
                    .eq('id', rapportId)
                    .select();  // ✅ AJOUT pour voir le résultat
                
                console.log('📬 Résultat UPDATE:', { data: updateResult, error });
                
                if (error) {
                    console.error('❌ ERREUR UPDATE:', error);
                    throw error;
                }
                
                console.log('✅ Rapport déplacé dans Supabase');
                console.log('🔵 ===== FIN DÉPLACEMENT =====');
                
            } catch (error) {
                console.error('❌ Erreur déplacement rapport:', error);
            }
        }
    }
}

    // === FONCTION SUPPRESSION DE RAPPORT (VERSION FRANCE) ===
    
    async deleteRapport(rapportId) {
        console.log('🗑️ Suppression rapport:', rapportId);
        
        // Récupérer le rapport avant suppression (pour avoir le pdfUrl)
        const rapport = this.getRapport(rapportId);
        if (!rapport) {
            Utils.showToast('Rapport introuvable', 'error');
            return false;
        }
        
        // Demander confirmation
        const confirmed = await this.showDeleteConfirmation(rapport.title);
        if (!confirmed) {
            console.log('❌ Suppression annulée par l\'utilisateur');
            return false;
        }
        
        try {
            // 1. Suppression du localStorage
            const data = this.loadAppData();
            data.rapports = data.rapports.filter(r => r.id !== rapportId);
            this.saveAppData(data);
            console.log('✅ Rapport supprimé du localStorage');
            
            // 2. Suppression de Supabase (table reports)
            if (this.canUseSupabase()) {
    console.log('🔄 Tentative suppression Supabase...');
    console.log('   User ID:', this.getUserId());
    console.log('   Rapport ID:', rapportId);
    
    // ✅ AJOUT CRITIQUE : .select() pour voir ce qui a été supprimé
    const { data: deletedData, error: deleteError } = await window.supabaseClient
        .from('reports')
        .delete()
        .eq('id', rapportId)
        .select();  // ← LIGNE CRITIQUE AJOUTÉE
    
    console.log('📬 Résultat DELETE:', {
        deletedData,
        deleteError,
        rowsDeleted: deletedData?.length || 0
    });
    
    if (deleteError) {
        console.error('❌ Erreur DELETE Supabase:', deleteError);
        Utils.showToast('⚠️ Erreur suppression Supabase: ' + deleteError.message, 'warning');
    } else if (!deletedData || deletedData.length === 0) {
        console.warn('⚠️⚠️⚠️ PROBLÈME : Aucune ligne supprimée !');
        
        // Vérifier si le rapport existe
        const { data: existing } = await window.supabaseClient
            .from('reports')
            .select('id, user_id, title')
            .eq('id', rapportId)
            .single();
        
        if (existing) {
            console.error('🚨 PROBLÈME RLS : Le rapport EXISTE mais ne peut pas être supprimé');
            console.error('   Rapport user_id:', existing.user_id);
            console.error('   Current user_id:', this.getUserId());
            Utils.showToast('⚠️ Problème de permissions Supabase (RLS)', 'error');
        } else {
            console.log('ℹ️ Le rapport n\'existe pas dans Supabase');
        }
    } else {
        console.log('✅✅✅ Rapport supprimé de Supabase:', deletedData[0]);
    }
                
                // 3. Suppression du PDF dans Supabase Storage (si existe)
                if (rapport.pdfUrl) {
                    try {
                        // Extraire le chemin du fichier depuis l'URL signée
                        const userId = this.getUserId();
                        const urlParts = rapport.pdfUrl.split('/');
                        const fileNameWithParams = urlParts[urlParts.length - 1];
                        const fileName = fileNameWithParams.split('?')[0]; // Retirer les query params
                        const filePath = `${userId}/${fileName}`;
                        
                        const { error: storageError } = await window.supabaseClient.storage
                            .from('vocalia-files')
                            .remove([filePath]);
                        
                        if (storageError) {
                            console.error('⚠️ Erreur suppression PDF Storage:', storageError);
                        } else {
                            console.log('✅ PDF supprimé du Storage');
                        }
                    } catch (storageErr) {
                        console.error('⚠️ Erreur lors de la suppression du PDF:', storageErr);
                    }
                }
            }
            
            // 4. Mettre à jour l'UI en rechargeant les données
            const updatedData = this.loadAppData();
            this.updateRapportsUI(updatedData.rapports);
            
            // 5. Afficher confirmation
            Utils.showToast('✅ Rapport supprimé avec succès', 'success');
            
            return true;
            
        } catch (error) {
            console.error('❌ Erreur lors de la suppression:', error);
            Utils.showToast('Erreur lors de la suppression du rapport', 'error');
            return false;
        }
    }
    
    // Modal de confirmation de suppression
    showDeleteConfirmation(rapportTitle) {
        return new Promise((resolve) => {
            const modal = Utils.createModal(
                'Confirmer la suppression',
                `
                <div style="text-align: center; padding: 20px 0;">
                    <div style="font-size: 48px; margin-bottom: 20px;">🗑️</div>
                    <p style="font-size: 16px; color: var(--gray-700); margin-bottom: 10px;">
                        Voulez-vous vraiment supprimer ce rapport ?
                    </p>
                    <p style="font-size: 14px; font-weight: 600; color: var(--gray-900); margin-bottom: 20px;">
                        "${Utils.escapeHtml(rapportTitle)}"
                    </p>
                    <p style="font-size: 13px; color: #ef4444; font-weight: 500;">
                        ⚠️ Cette action est irréversible
                    </p>
                </div>
                `,
                []
            );
            
            const footer = modal.querySelector('.modal-footer');
            footer.innerHTML = '';
            
            const cancelBtn = document.createElement('button');
            cancelBtn.className = 'btn-secondary';
            cancelBtn.textContent = 'Annuler';
            cancelBtn.addEventListener('click', () => {
                modal.remove();
                resolve(false);
            });
            
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'btn-primary';
            deleteBtn.style.background = '#ef4444';
            deleteBtn.textContent = '🗑️ Supprimer';
            deleteBtn.addEventListener('click', () => {
                modal.remove();
                resolve(true);
            });
            
            footer.appendChild(cancelBtn);
            footer.appendChild(deleteBtn);
        });
    }

    getRapport(rapportId) {
        const data = this.loadAppData();
        return data.rapports.find(r => r.id === rapportId);
    }

    showCreateFolderModal() {
        const modal = Utils.createModal(
            'Créer un nouveau dossier',
            `
                <label style="display: block; margin-bottom: 10px; font-weight: bold;">
                    Nom du dossier :
                </label>
                <input type="text" id="newFolderName" class="modal-input" placeholder="Ex: Clients 2024" autofocus>
            `,
            []
        );
        
        const footer = modal.querySelector('.modal-footer');
        footer.innerHTML = '';
        
        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'btn-secondary';
        cancelBtn.textContent = 'Annuler';
        cancelBtn.addEventListener('click', () => {
            console.log('🔴 Création de dossier annulée');
            modal.remove();
        });
        
        const createBtn = document.createElement('button');
        createBtn.className = 'btn-primary';
        createBtn.textContent = '✅ Créer';
        createBtn.addEventListener('click', () => {
            console.log('✅ Création de dossier confirmée');
            this.handleCreateFolder(createBtn);
        });
        
        footer.appendChild(cancelBtn);
        footer.appendChild(createBtn);

        const input = modal.querySelector('#newFolderName');
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.handleCreateFolder(createBtn);
            }
        });
    }

    async handleCreateFolder(element) {
        const modal = element.closest('[data-modal]');
        const input = modal.querySelector('#newFolderName');
        const folderName = input.value.trim();

        // ✅ CORRECTION : Attendre la création du dossier
        const newFolder = await this.createFolder(folderName);
        
        if (newFolder) {
            modal.remove();
            // ✅ CORRECTION : Recharger l'UI pour afficher le nouveau dossier
            const data = this.loadAppData();
            this.updateRapportsUI(data.rapports);
        }
    }

    showMoveFolderModal(rapportId) {
        const data = this.loadAppData();
        const folders = data.folders || [];
        const rapport = data.rapports.find(r => r.id === rapportId);

        const foldersOptions = [
            `<option value="">Aucun dossier</option>`,
            ...folders.map(folder => 
                `<option value="${folder.id}" ${rapport.folderId === folder.id ? 'selected' : ''}>
                    📁 ${Utils.escapeHtml(folder.name)}
                </option>`
            )
        ].join('');

        const modal = Utils.createModal(
            'Déplacer le rapport',
            `
                <label style="display: block; margin-bottom: 10px; font-weight: bold;">
                    Choisir un dossier :
                </label>
                <select id="folderSelect" class="modal-input" style="cursor: pointer;">
                    ${foldersOptions}
                </select>
            `,
            []
        );
        
        const footer = modal.querySelector('.modal-footer');
        footer.innerHTML = '';
        
        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'btn-secondary';
        cancelBtn.textContent = 'Annuler';
        cancelBtn.addEventListener('click', () => {
            console.log('🔴 Déplacement annulé');
            modal.remove();
        });
        
        const moveBtn = document.createElement('button');
        moveBtn.className = 'btn-primary';
        moveBtn.textContent = '📂 Déplacer';
        moveBtn.addEventListener('click', () => {
            console.log('✅ Déplacement confirmé');
            this.handleMoveRapport(rapportId, moveBtn);
        });
        
        footer.appendChild(cancelBtn);
        footer.appendChild(moveBtn);
    }

    handleMoveRapport(rapportId, buttonElement) {
        const modal = buttonElement.closest('[data-modal]');
        const select = modal.querySelector('#folderSelect');
        const folderId = select.value || null;

        this.moveRapportToFolder(rapportId, folderId);
        modal.remove();
    }

    async downloadPDF(rapportId) {
        const data = this.loadAppData();
        const rapport = data.rapports.find(r => r.id === rapportId);
        
        if (!rapport) return;
        
        if (rapport.pdfUrl) {
            try {
                Utils.showToast('Téléchargement du PDF...', 'info');
                
                const link = document.createElement('a');
                link.href = rapport.pdfUrl;
                link.download = `${rapport.title.replace(/[^a-z0-9]/gi, '_')}.pdf`;
                link.target = '_blank';
                link.click();
                
                Utils.showToast('PDF téléchargé', 'success');
                return;
            } catch (error) {
                console.error('❌ Erreur téléchargement PDF:', error);
            }
        }
        
        if (rapport.pdfData) {
            const byteCharacters = atob(rapport.pdfData.split(',')[1]);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: 'application/pdf' });
            
            const filename = `${rapport.title.replace(/[^a-z0-9]/gi, '_')}.pdf`;
            Utils.downloadFile(blob, filename);
            Utils.showToast('PDF téléchargé', 'success');
        } else {
            Utils.showToast('PDF non disponible', 'error');
        }
    }

    async shareRapport(rapportId) {
        const data = this.loadAppData();
        const rapport = data.rapports.find(r => r.id === rapportId);
        
        if (!rapport) return;
        
        if (rapport.pdfUrl) {
            try {
                if (navigator.share) {
                    await navigator.share({
                        title: rapport.title,
                        text: `Nouveau rapport: ${rapport.title}`,
                        url: rapport.pdfUrl
                    });
                    Utils.showToast('Rapport partagé', 'success');
                    return;
                } else {
                    await Utils.copyToClipboard(rapport.pdfUrl);
                    Utils.showToast('Lien PDF copié dans le presse-papier', 'success');
                    return;
                }
            } catch (error) {
                console.error('Erreur partage PDF:', error);
            }
        }
        
        this.shareRapportAsText(rapport);
    }

    async shareRapportAsText(rapport) {
        const shareText = `${rapport.title}\n\n${rapport.content}`;
        
        const shared = await Utils.shareContent(rapport.title, shareText);
        
        if (!shared) {
            const copied = await Utils.copyToClipboard(shareText);
            if (copied) {
                Utils.showToast('Rapport copié dans le presse-papier', 'success');
            } else {
                Utils.showToast('Erreur lors du partage', 'error');
            }
        }
    }

    // NOTE: Les fonctions translateRapport, viewRapport, updateBrouillonsUI, updateRapportsUI, etc.
    // restent identiques à celles que tu avais déjà, je les omets ici pour gagner de l'espace.
    // Garde-les telles quelles dans ton fichier actuel.

    loadBrouillonsData() {
        const brouillons = this.getBrouillons();
        this.updateBrouillonsUI(brouillons);
    }

    loadRapportsData() {
        const rapports = this.getRapports();
        this.updateRapportsUI(rapports);
    }

    extractTitleFromContent(content) {
        if (!content) return 'Rapport sans titre';
        
        const patterns = [
            /titre\s*[:=]\s*([^\n\r]+)/i,
            /title\s*[:=]\s*([^\n\r]+)/i,
            /client\s*[:=]\s*([^\n\r]+)/i,
            /^([^\n\r]{10,80})/
        ];
        
        for (const pattern of patterns) {
            const match = content.match(pattern);
            if (match && match[1]) {
                return match[1].trim().replace(/^[#\-*=\s]+|[#\-*=\s]+$/g, '');
            }
        }
        
        return 'Rapport sans titre';
    }

    filterRapports(searchTerm) {
        const data = this.loadAppData();
        const rapports = data.rapports || [];
        
        if (!searchTerm) {
            this.updateRapportsUI(rapports);
            return;
        }

        const filtered = rapports.filter(rapport => 
            rapport.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            rapport.content.toLowerCase().includes(searchTerm.toLowerCase())
        );
        
        this.updateRapportsUI(filtered);
    }

    exportRapport(id) {
        this.downloadPDF(id);
    }

    
async translateRapport(rapportId) {
        const data = this.loadAppData();
        const rapport = data.rapports.find(r => r.id === rapportId);
        
        if (!rapport) return;

        console.log('🔍 Vérification du plan pour traduction...');
        
        const userPlan = await Utils.checkUserPlan();
        
        console.log('📊 Plan utilisateur:', userPlan);
        
        if (userPlan !== 'pro') {
            console.log('🚫 BLOCAGE - Plan FREE: Traduction réservée au PRO');
            
            Utils.showUpgradeModal(
                '🌍 Traduction réservée au plan PRO',
                'Traduisez instantanément vos rapports en <strong>6 langues</strong> :<br>🇫🇷 Français • 🇬🇧 Anglais • 🇨🇳 Chinois • 🇯🇵 Japonais • 🇪🇸 Espagnol • 🇩🇪 Allemand',
                'translation'
            );
            
            return;
        }
        
        console.log('✅ Plan PRO confirmé - Traduction autorisée');

        let sourceRapport = rapport;
        if (rapport.isTranslation && rapport.originalReportId) {
            sourceRapport = data.rapports.find(r => r.id === rapport.originalReportId) || rapport;
        }
        
        const modal = Utils.createModal(
            'Traduire le rapport',
            `
                <div style="margin-bottom: 20px; padding: 15px; background: var(--gray-50); border-radius: 10px;">
                    <p style="margin: 0 0 10px 0;"><strong>Rapport original :</strong></p>
                    <p style="color: var(--gray-600); font-size: 14px; margin: 0; font-weight: 600;">
                        ${Utils.escapeHtml(sourceRapport.title)}
                    </p>
                    <p style="color: var(--gray-500); font-size: 13px; margin-top: 8px;">
                        ${Utils.truncateText(sourceRapport.content, 200)}
                    </p>
                </div>
                
                <label style="display: block; margin-bottom: 10px; font-weight: bold; color: var(--gray-800);">
                    Langue cible :
                </label>
                <select id="targetLanguage" class="modal-input" style="cursor: pointer;">
                    <option value="en">🇬🇧 English</option>
                    <option value="fr">🇫🇷 Français</option>
                    <option value="zh">🇨🇳 中文</option>
                    <option value="ja">🇯🇵 日本語</option>
                    <option value="es">🇪🇸 Español</option>
                    <option value="de">🇩🇪 Deutsch</option>
                </select>
                
                <div style="margin-top: 20px; padding: 15px; background: var(--primary-ultra-light); border-radius: 10px; border-left: 4px solid var(--primary);">
                    <p style="font-size: 13px; color: var(--gray-700); margin: 0; line-height: 1.6;">
                        <strong>ℹ️ Note:</strong> La traduction sera créée comme un nouveau rapport distinct.
                    </p>
                </div>
            `,
            []
        );
        
        const footer = modal.querySelector('.modal-footer');
        footer.innerHTML = '';
        
        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'btn-secondary';
        cancelBtn.textContent = 'Annuler';
        cancelBtn.addEventListener('click', () => {
            console.log('🔴 Traduction annulée');
            modal.remove();
        });
        
        const translateBtn = document.createElement('button');
        translateBtn.className = 'btn-primary';
        translateBtn.textContent = '🌐 Traduire';
        translateBtn.addEventListener('click', () => {
            console.log('✅ Traduction confirmée');
            this.processTranslation(sourceRapport.id, translateBtn);
        });
        
        footer.appendChild(cancelBtn);
        footer.appendChild(translateBtn);
    }

    async processTranslation(rapportId, buttonElement) {
        const modal = buttonElement.closest('[data-modal]');
        const targetLang = modal.querySelector('#targetLanguage').value;
        
        buttonElement.disabled = true;
        buttonElement.innerHTML = '<div class="loading-spinner" style="display: inline-block; width: 16px; height: 16px; margin-right: 8px;"></div> Traduction en cours...';
        
        const data = this.loadAppData();
        const rapport = data.rapports.find(r => r.id === rapportId);
        
        if (!rapport) {
            modal.remove();
            return;
        }
        
        try {
            console.log('=== DÉBUT TRADUCTION ===');
            
            const response = await fetch(CONFIG.N8N_TRANSLATE_WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    reportId: rapportId,
                    title: rapport.title,
                    content: rapport.content,
                    targetLanguage: targetLang,
                    userId: window.appManager?.getCurrentUser()?.id || 'unknown',
                    timestamp: new Date().toISOString()
                })
            });
            
            if (!response.ok) {
                throw new Error(`Erreur N8n: ${response.status}`);
            }
            
            const result = await response.json();
            
            if (!result.success) {
                throw new Error('La traduction a échoué côté serveur');
            }
            
            const translatedRapport = {
                id: Utils.generateId('rapport_translated_'),
                title: result.translatedTitle || `[${targetLang.toUpperCase()}] ${rapport.title}`,
                content: result.translatedContent || result.content,
                validatedAt: new Date().toISOString(),
                createdAt: new Date().toISOString(),
                
                isTranslation: true,
                originalReportId: rapportId,
                detectedLanguage: result.detectedSourceLanguage || 'unknown',
                translatedTo: targetLang,
                translatedAt: new Date().toISOString(),
                
                folderId: rapport.folderId,
                
                hasPdf: false,
                pdfGenerated: false,
                pdfUrl: null
            };
            
            modal.remove();
            
            try {
                Utils.showToast('Génération du PDF...', 'info', 2000);
                const pdf = await Utils.generatePDF(translatedRapport.title, translatedRapport.content);
                
                if (this.canUseSupabase()) {
                    const pdfUrl = await this.uploadPdfToStorage(
                        pdf.output('datauristring'),
                        translatedRapport.title
                    );
                    
                    if (pdfUrl) {
                        translatedRapport.pdfUrl = pdfUrl;
                        translatedRapport.hasPdf = true;
                        translatedRapport.pdfGenerated = true;
                    } else {
                        translatedRapport.pdfData = pdf.output('datauristring');
                        translatedRapport.hasPdf = true;
                        translatedRapport.pdfGenerated = true;
                    }
                } else {
                    translatedRapport.pdfData = pdf.output('datauristring');
                    translatedRapport.hasPdf = true;
                    translatedRapport.pdfGenerated = true;
                }
            } catch (pdfError) {
                console.warn('Erreur génération PDF:', pdfError);
            }
            
            data.rapports.unshift(translatedRapport);
            this.saveAppData(data);
            this.updateRapportsUI(data.rapports);
            
            const langName = this.getLanguageName(targetLang);
            Utils.showToast(`Rapport traduit en ${langName}`, 'success');
            
            if (this.canUseSupabase()) {
                try {
                    const supabaseReport = this.convertReportToSupabase(translatedRapport);
                    const { error } = await window.supabaseClient
                        .from('reports')
                        .insert([supabaseReport]);
                    
                    if (error) throw error;
                    console.log('✅ Traduction sauvegardée dans Supabase');
                } catch (error) {
                    console.error('❌ Erreur sauvegarde traduction:', error);
                }
            }
            
            console.log('=== TRADUCTION TERMINÉE ===');
            
        } catch (error) {
            console.error('Erreur traduction:', error);
            modal.remove();
            Utils.showToast('Erreur lors de la traduction: ' + error.message, 'error');
        }
    }

    getLanguageName(code) {
        const languages = {
            'en': 'English',
            'fr': 'Français',
            'zh': '中文',
            'ja': '日本語',
            'es': 'Español',
            'de': 'Deutsch',
            'unknown': '?'
        };
        return languages[code] || code.toUpperCase();
    }

    viewRapport(rapportId) {
        const data = this.loadAppData();
        const rapport = data.rapports.find(r => r.id === rapportId);
        
        if (!rapport) return;
        
        const validatedDate = Utils.formatDate(rapport.validatedAt);
        const modifiedWarning = rapport.isModified ? `<br><em>⚠️ Rapport modifié après génération</em>` : '';
        const pdfAvailable = rapport.hasPdf ? `<br><strong>📄 PDF disponible</strong>` : '';
        
        let translationInfo = '';
        if (rapport.isTranslation) {
            translationInfo = `
                <div style="
                    background: linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(124, 58, 237, 0.05));
                    padding: 12px;
                    border-radius: 8px;
                    margin-bottom: 15px;
                    border-left: 3px solid #8b5cf6;
                ">
                    <strong>🌐 Traduction</strong> : ${this.getLanguageName(rapport.translatedTo)}
                    ${rapport.originalReportId ? `<br><small>Rapport original disponible</small>` : ''}
                </div>
            `;
        }
        
        const modal = Utils.createModal(
            `📋 ${rapport.title}`,
            `
                <div style="background: #f8f9fa; padding: 10px; border-radius: 8px; margin-bottom: 15px; font-size: 14px; color: #666;">
                    <strong>Validé le :</strong> ${validatedDate}
                    ${modifiedWarning}
                    ${pdfAvailable}
                </div>
                ${translationInfo}
                <div style="line-height: 1.6; font-size: 15px; white-space: pre-wrap;">
                    ${Utils.escapeHtml(rapport.content)}
                </div>
            `,
            []
        );
        
        const footer = modal.querySelector('.modal-footer');
        footer.innerHTML = '';
        
        if (rapport.isTranslation && rapport.originalReportId) {
            const original = data.rapports.find(r => r.id === rapport.originalReportId);
            if (original) {
                const compareBtn = document.createElement('button');
                compareBtn.className = 'btn-primary';
                compareBtn.textContent = '🔄 Comparer avec l\'original';
                compareBtn.addEventListener('click', () => {
                    modal.remove();
                    this.viewComparison(original.id, rapport.id);
                });
                footer.appendChild(compareBtn);
            }
        }
        
        const closeBtn = document.createElement('button');
        closeBtn.className = 'btn-secondary';
        closeBtn.textContent = 'Fermer';
        closeBtn.addEventListener('click', () => {
            modal.remove();
        });
        footer.appendChild(closeBtn);
    }

    viewComparison(originalId, translatedId) {
        const data = this.loadAppData();
        const original = data.rapports.find(r => r.id === originalId);
        const translated = data.rapports.find(r => r.id === translatedId);
        
        if (!original || !translated) return;
        
        const modal = Utils.createModal(
            `🌐 Traduction - ${translated.title}`,
            `
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; max-height: 70vh; overflow: hidden;">
                    
                    <div style="border-right: 2px solid var(--gray-200); padding-right: 20px; overflow-y: auto;">
                        <div style="background: var(--gray-100); padding: 12px; border-radius: 10px; margin-bottom: 15px; position: sticky; top: 0; z-index: 1;">
                            <h4 style="margin: 0; color: var(--gray-800); font-size: 14px;">
                                📄 Rapport original
                                <span style="background: var(--gray-500); color: white; padding: 2px 8px; border-radius: 6px; font-size: 11px; margin-left: 8px;">
                                    ${this.getLanguageName(original.detectedLanguage || translated.detectedLanguage)}
                                </span>
                            </h4>
                        </div>
                        <h3 style="color: var(--gray-900); font-size: 16px; margin-bottom: 15px;">${Utils.escapeHtml(original.title)}</h3>
                        <div style="line-height: 1.6; font-size: 14px; white-space: pre-wrap; color: var(--gray-700);">
                            ${Utils.escapeHtml(original.content)}
                        </div>
                    </div>
                    
                    <div style="overflow-y: auto;">
                        <div style="background: linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(124, 58, 237, 0.05)); padding: 12px; border-radius: 10px; margin-bottom: 15px; position: sticky; top: 0; z-index: 1;">
                            <h4 style="margin: 0; color: #7c3aed; font-size: 14px;">
                                🌐 Traduction
                                <span style="background: #8b5cf6; color: white; padding: 2px 8px; border-radius: 6px; font-size: 11px; margin-left: 8px;">
                                    ${this.getLanguageName(translated.translatedTo)}
                                </span>
                            </h4>
                        </div>
                        <h3 style="color: var(--gray-900); font-size: 16px; margin-bottom: 15px;">${Utils.escapeHtml(translated.title)}</h3>
                        <div style="line-height: 1.6; font-size: 14px; white-space: pre-wrap; color: var(--gray-700);">
                            ${Utils.escapeHtml(translated.content)}
                        </div>
                    </div>
                    
                </div>
            `,
            []
        );
        
        const footer = modal.querySelector('.modal-footer');
        footer.innerHTML = '';
        
        const pdfOriginalBtn = document.createElement('button');
        pdfOriginalBtn.className = 'btn-secondary';
        pdfOriginalBtn.textContent = '📄 PDF Original';
        pdfOriginalBtn.addEventListener('click', () => {
            this.downloadPDF(original.id);
            modal.remove();
        });
        
        const pdfTranslatedBtn = document.createElement('button');
        pdfTranslatedBtn.className = 'btn-primary';
        pdfTranslatedBtn.textContent = '📄 PDF Traduit';
        pdfTranslatedBtn.addEventListener('click', () => {
            this.downloadPDF(translated.id);
            modal.remove();
        });
        
        footer.appendChild(pdfOriginalBtn);
        footer.appendChild(pdfTranslatedBtn);
    }

    // === AFFICHAGE DES BROUILLONS ===
    
    updateBrouillonsUI(brouillons) {
        const container = document.getElementById('brouillonsList');
        if (!container) return;

        if (!brouillons || brouillons.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="icon">📄</div>
                    <p>Aucun brouillon</p>
                    <p class="empty-subtitle">Enregistrez un message vocal pour créer votre premier rapport</p>
                </div>
            `;
            return;
        }

        container.innerHTML = brouillons.map(brouillon => {
            const date = Utils.formatDate(brouillon.createdAt);
            let statusClass = '';
            let statusIcon = '📄';

            if (brouillon.status === 'generating') {
                statusClass = 'status-generating';
                statusIcon = '⏳';
            } else if (brouillon.status === 'error') {
                statusClass = 'status-error';
                statusIcon = '⚠️';
            }

            const content = brouillon.generatedReport || '⏳ Génération en cours...';
            const truncatedContent = Utils.truncateText(content, 100);
            const sourceIndicator = brouillon.sourceType === 'upload' ? '📁' : '🎤';

            return `
                <div class="report-item ${statusClass}">
                    <div class="report-header">
                        <div class="report-title">${statusIcon} ${sourceIndicator} ${Utils.escapeHtml(brouillon.title || 'Nouveau rapport')}</div>
                        <div class="report-date">${date}</div>
                    </div>
                    <div class="report-content">${Utils.escapeHtml(truncatedContent)}</div>
                    <div class="report-actions">
                        ${brouillon.status === 'ready' ? `
                            <button class="action-btn edit-btn" onclick="window.dataManager.editBrouillon('${brouillon.id}')">✏️ Éditer</button>
                            <button class="action-btn validate-btn" onclick="window.dataManager.validateBrouillon('${brouillon.id}')">✅ Valider</button>
                        ` : ''}
                        ${brouillon.status === 'generating' ? `
                            <div class="loading-spinner"></div>
                        ` : ''}
                        ${brouillon.status === 'error' ? `
                            <button class="action-btn edit-btn" disabled>🔄 Audio non disponible</button>
                        ` : ''}
                        <button class="action-btn delete-btn" onclick="window.dataManager.deleteBrouillon('${brouillon.id}')">🗑️ Supprimer</button>
                    </div>
                </div>
            `;
        }).join('');
    }

    // === AFFICHAGE DES RAPPORTS ===
    
    updateRapportsUI(rapports) {
        const container = document.getElementById('rapportsList');
        const counter = document.getElementById('rapportsCount');
        const pdfCounter = document.getElementById('pdfCount');
        
        if (counter) {
            counter.textContent = rapports ? rapports.length : 0;
        }
        
        if (pdfCounter) {
            const pdfCount = rapports ? rapports.filter(r => r.hasPdf).length : 0;
            pdfCounter.textContent = pdfCount;
        }
        
        if (!container) return;
        
        if (!rapports || rapports.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="icon">📋</div>
                    <p>Aucun rapport validé</p>
                    <p class="empty-subtitle">Validez vos brouillons pour créer vos premiers rapports</p>
                </div>
            `;
            return;
        }

        const data = this.loadAppData();
        const folders = data.folders || [];

        if (this.currentFolderId) {
            const currentFolder = folders.find(f => f.id === this.currentFolderId);
            const folderRapports = rapports.filter(r => r.folderId === this.currentFolderId);
            
            container.innerHTML = `
                <div class="breadcrumb-container">
                    <button 
                        class="breadcrumb-back-btn"
                        onclick="window.dataManager.closeFolder()"
                    >
                        ← Retour
                    </button>
                    
                    <span class="breadcrumb-separator">›</span>
                    
                    <div class="breadcrumb-current">
                        <span class="breadcrumb-folder-icon">📁</span>
                        <h2 class="breadcrumb-folder-name">
                            ${Utils.escapeHtml(currentFolder?.name || 'Dossier')}
                        </h2>
                        <span class="breadcrumb-folder-count">
                            ${folderRapports.length}
                        </span>
                    </div>
                    
                    <div class="breadcrumb-actions" onclick="event.stopPropagation();">
                        <button class="action-btn" style="background: var(--warning); color: white;" onclick="window.dataManager.renameFolder('${this.currentFolderId}')">
                            ✏️ Renommer
                        </button>
                        <button class="action-btn" style="background: var(--error); color: white;" onclick="window.dataManager.deleteFolder('${this.currentFolderId}')">
                            🗑️ Supprimer
                        </button>
                    </div>
                </div>
                
                <div class="reports-grid">
                    ${folderRapports.length > 0 ? folderRapports.map(rapport => this.renderRapportCard(rapport)).join('') : `
                        <div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px; color: var(--gray-500);">
                            <div style="font-size: 64px; margin-bottom: 20px; opacity: 0.5;">📭</div>
                            <p style="font-size: 18px; font-weight: 600;">Ce dossier est vide</p>
                        </div>
                    `}
                </div>
            `;
            return;
        }

        const rapportsSansDossier = rapports.filter(r => !r.folderId);
        
        let html = '';

        if (folders.length > 0) {
            html += `
                <div style="margin-bottom: 40px;">
                    <h3 class="reports-section-title">
                        📁 Dossiers
                        <span class="count-badge">${folders.length}</span>
                    </h3>
                    
                    <div class="folder-card-grid">
                        ${folders.map(folder => {
                            const folderRapports = rapports.filter(r => r.folderId === folder.id);
                            
                            return `
                                <div 
                                    class="folder-card"
                                    onclick="window.dataManager.openFolder('${folder.id}')"
                                >
                                    <div class="folder-card-content">
                                        <div class="folder-icon">📁</div>
                                        <div class="folder-info">
                                            <div class="folder-name">${Utils.escapeHtml(folder.name)}</div>
                                            <div class="folder-count">${this.getReportsCountText(folderRapports.length)}</div>
                                        </div>
                                    </div>
                                    
                                    <div class="folder-actions" onclick="event.stopPropagation();">
                                        <button class="folder-action-btn" onclick="window.dataManager.renameFolder('${folder.id}')">
                                            ✏️
                                        </button>
                                        <button class="folder-action-btn" onclick="window.dataManager.deleteFolder('${folder.id}')">
                                            🗑️
                                        </button>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            `;
        }

        if (rapportsSansDossier.length > 0) {
            html += `
                <div>
                    <h3 class="reports-section-title">
                        📄 Aucun dossier
                        <span class="count-badge">${rapportsSansDossier.length}</span>
                    </h3>
                    
                    <div class="reports-compact-list">
                        ${rapportsSansDossier.map(rapport => this.renderRapportCardCompact(rapport)).join('')}
                    </div>
                </div>
            `;
        }

        container.innerHTML = html;
    }

    renderRapportCard(rapport) {
        const dateValidated = new Date(rapport.validatedAt).toLocaleDateString();
        const truncatedContent = Utils.truncateText(rapport.content, 150);
        
        let sourceIcon = '🎤';
        if (rapport.sourceType === 'upload') {
            sourceIcon = '📁';
        }
        
        const pdfIndicator = rapport.hasPdf ? '📄' : '';
        
        return `
            <div class="report-item" onclick="window.dataManager.viewRapport('${rapport.id}')">
                <div class="report-header">
                    <div class="report-title">
                        ${sourceIcon} ${pdfIndicator} ${Utils.escapeHtml(rapport.title)}
                    </div>
                    <div class="report-date">Validé le ${dateValidated}</div>
                </div>
                
                <div class="report-content">${Utils.escapeHtml(truncatedContent)}</div>
                
                <div class="report-actions">
                    <button class="action-btn view-btn" onclick="event.stopPropagation(); window.dataManager.viewRapport('${rapport.id}')">
                        👁️ Voir
                    </button>
                    
                    ${rapport.hasPdf ? `
                        <button class="action-btn download-pdf-btn" onclick="event.stopPropagation(); window.dataManager.downloadPDF('${rapport.id}')">
                            📄 PDF
                        </button>
                    ` : ''}
                    
                    <button class="action-btn share-btn" onclick="event.stopPropagation(); window.dataManager.shareRapport('${rapport.id}')">
                        📤 Partager
                    </button>
                    
                    <button class="action-btn move-btn" 
                            onclick="event.stopPropagation(); window.dataManager.showMoveFolderModal('${rapport.id}')">
                        📂 Déplacer
                    </button>
                    
                    <button class="action-btn delete-btn" 
                            onclick="event.stopPropagation(); window.dataManager.deleteRapport('${rapport.id}')"
                            style="background: #ef4444; color: white;">
                        🗑️ Supprimer
                    </button>
                </div>
            </div>
        `;
    }

    renderRapportCardCompact(rapport) {
        const dateValidated = new Date(rapport.validatedAt).toLocaleDateString();
        const truncatedContent = Utils.truncateText(rapport.content, 150);
        
        let sourceIcon = '🎤';
        if (rapport.sourceType === 'upload') {
            sourceIcon = '📁';
        }
        
        const pdfIndicator = rapport.hasPdf ? '📄' : '';
        
        return `
            <div 
                class="report-item-compact"
                onclick="window.dataManager.viewRapport('${rapport.id}')"
                style="
                    background: white;
                    border: 1px solid var(--gray-200);
                    border-radius: 10px;
                    padding: 20px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    position: relative;
                    overflow: hidden;
                "
                onmouseover="
                    this.style.borderColor='#8B153840'; 
                    this.style.boxShadow='0 2px 8px rgba(139, 21, 56, 0.08)';
                    this.querySelector('.report-compact-indicator').style.opacity='1';
                " 
                onmouseout="
                    this.style.borderColor='var(--gray-200)'; 
                    this.style.boxShadow='none';
                    this.querySelector('.report-compact-indicator').style.opacity='0';
                "
            >
                <div class="report-compact-indicator" style="
                    position: absolute;
                    left: 0;
                    top: 0;
                    bottom: 0;
                    width: 3px;
                    background: var(--primary);
                    opacity: 0;
                    transition: all 0.2s ease;
                "></div>
                
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; gap: 15px;">
                    <div style="flex: 1; min-width: 0;">
                        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px; flex-wrap: wrap;">
                            <h4 style="
                                margin: 0; 
                                font-size: 16px; 
                                font-weight: 600; 
                                color: var(--gray-900);
                                display: flex;
                                align-items: center;
                                gap: 6px;
                            ">
                                ${sourceIcon} ${pdfIndicator} ${Utils.escapeHtml(rapport.title)}
                            </h4>
                        </div>
                        
                        <p style="
                            margin: 0; 
                            font-size: 13px; 
                            color: var(--gray-500);
                            overflow: hidden;
                            text-overflow: ellipsis;
                            display: -webkit-box;
                            -webkit-line-clamp: 2;
                            -webkit-box-orient: vertical;
                        ">
                            ${Utils.escapeHtml(truncatedContent)}
                        </p>
                    </div>
                    
                    <div style="
                        font-size: 12px; 
                        color: var(--gray-400); 
                        background: var(--gray-50);
                        padding: 4px 10px;
                        border-radius: 8px;
                        white-space: nowrap;
                        border: 1px solid var(--gray-200);
                        font-weight: 500;
                    ">
                        ${dateValidated}
                    </div>
                </div>
                
                <div style="
                    display: flex; 
                    gap: 8px; 
                    flex-wrap: wrap;
                    padding-top: 12px;
                    border-top: 1px solid var(--gray-100);
                " onclick="event.stopPropagation();">
                    <button class="action-btn view-btn" 
                            style="font-size: 11px; padding: 6px 12px;"
                            onclick="window.dataManager.viewRapport('${rapport.id}')">
                        👁️ Voir
                    </button>
                    
                    ${rapport.hasPdf ? `
                        <button class="action-btn download-pdf-btn" 
                                style="font-size: 11px; padding: 6px 12px;"
                                onclick="window.dataManager.downloadPDF('${rapport.id}')">
                            📄 PDF
                        </button>
                    ` : ''}
                    
                    <button class="action-btn share-btn" 
                            style="font-size: 11px; padding: 6px 12px;"
                            onclick="window.dataManager.shareRapport('${rapport.id}')">
                        📤 Partager
                    </button>
                    
                    <button class="action-btn move-btn" 
                            style="font-size: 11px; padding: 6px 12px;" 
                            onclick="window.dataManager.showMoveFolderModal('${rapport.id}')">
                        📂 Déplacer
                    </button>
                    
                    <button class="action-btn delete-btn" 
                            style="font-size: 11px; padding: 6px 12px; background: #ef4444; color: white;"
                            onclick="window.dataManager.deleteRapport('${rapport.id}')">
                        🗑️ Supprimer
                    </button>
                </div>
            </div>
        `;
    }
    }