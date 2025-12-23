/* ===================================
   KINESIA - Diagnostic Generation Logic
   VERSION ASYNCHRONE AVEC POLLING + ÉDITION
   =================================== */

/**
 * Générer un diagnostic pour une consultation (système asynchrone)
 */
async function generateDiagnostic(consultationId) {
  let pollingInterval = null;
  let startTime = Date.now();
  
  try {
    const btnGenerate = document.getElementById('btn-generate-diagnostic');
    const btnText = document.getElementById('btn-diag-text');
    const btnLoader = document.getElementById('btn-diag-loader');
    const diagnosticSection = document.getElementById('diagnostic-section');
    const diagnosticContent = document.getElementById('diagnostic-content');
    
    // Loading state
    if (btnGenerate) btnGenerate.disabled = true;
    if (btnText) btnText.classList.add('hidden');
    if (btnLoader) btnLoader.classList.remove('hidden');
    
    // Afficher la section diagnostic
    if (diagnosticSection) {
      diagnosticSection.classList.remove('hidden');
    }
    
    // Message de chargement
    if (diagnosticContent) {
      diagnosticContent.innerHTML = `
        <div class="diagnostic-loading" style="padding: 40px; text-align: center;">
          <div class="loading-spinner" style="font-size: 48px; margin-bottom: 20px;">🔄</div>
          <h3 style="font-size: 24px; margin-bottom: 16px; color: #1e293b;">Génération du diagnostic en cours...</h3>
          <p style="color: #64748b; margin-bottom: 24px;">L'IA analyse votre consultation avec la base médicale.</p>
          <div style="width: 100%; max-width: 500px; margin: 0 auto; background: #e5e7eb; border-radius: 8px; height: 8px; overflow: hidden;">
            <div id="progress-bar" style="width: 0%; background: linear-gradient(90deg, #3b82f6, #8b5cf6); height: 100%; border-radius: 8px; transition: width 1s ease;"></div>
          </div>
          <p id="progress-text" style="margin-top: 16px; color: #64748b; font-size: 14px;">⏱️ Initialisation...</p>
        </div>
      `;
    }
    
    const user = await getCurrentUser();
    
    // 1. APPELER N8N (réponse immédiate)
    console.log('📤 Envoi de la requête à N8N...');
    
    const response = await fetch(CONFIG.N8N_WEBHOOK_DIAGNOSTIC, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        consultation_id: consultationId,
        user_id: user.id
      }),
      mode: 'cors'
    });
    
    if (!response.ok) {
      throw new Error(`Erreur HTTP ${response.status}`);
    }
    
    const initialResponse = await response.json();
    console.log('📥 Réponse initiale de N8N:', initialResponse);
    
    console.log('Réponse N8N complète:', initialResponse);

    if (!initialResponse.success && !initialResponse.status) {
      throw new Error('Réponse inattendue du serveur: ' + JSON.stringify(initialResponse));
    }
    
    // 2. POLLING : Interroger Supabase toutes les 5 secondes
    console.log('🔄 Démarrage du polling...');
    
    const progressBar = document.getElementById('progress-bar');
    const progressText = document.getElementById('progress-text');
    
    let attempts = 0;
    const maxAttempts = 60; // 5 minutes maximum (60 * 5s)
    
    return new Promise((resolve, reject) => {
      pollingInterval = setInterval(async () => {
        attempts++;
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        
        // Mise à jour de la progression
        const progress = Math.min(95, (attempts / maxAttempts) * 100);
        if (progressBar) {
          progressBar.style.width = `${progress}%`;
        }
        
        if (progressText) {
          let statusMsg = '🔍 Analyse en cours...';
          if (elapsed > 30) statusMsg = '🧠 Recherche médicale...';
          if (elapsed > 60) statusMsg = '📋 Génération du diagnostic...';
          if (elapsed > 90) statusMsg = '✨ Finalisation...';
          
          progressText.innerHTML = `⏱️ ${statusMsg}<br><span style="font-size: 12px; color: #94a3b8;">Temps écoulé : ${elapsed}s</span>`;
        }
        
        console.log(`🔄 Polling tentative ${attempts}/${maxAttempts}...`);
        
        try {
          // Interroger Supabase
          const client = getSupabaseClient();
          const { data, error } = await client
            .from('diagnostic_reports')
            .select('*')
            .eq('consultation_id', consultationId)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          
          if (error && error.code !== 'PGRST116') {
            console.error('❌ Erreur Supabase:', error);
            throw error;
          }
          
          // Vérifier si le diagnostic est prêt
          if (data && data.status === 'completed') {
            console.log('✅ Diagnostic prêt!', data);
            
            // Arrêter le polling
            if (pollingInterval) {
              clearInterval(pollingInterval);
              pollingInterval = null;
            }
            
            // Afficher le diagnostic avec boutons
            displayDiagnosticWithActions(data, consultationId);
            
            const totalTime = Math.floor((Date.now() - startTime) / 1000);
            showToast(`✅ Diagnostic généré en ${totalTime}s`, 'success');
            
            // Reset button
            if (btnGenerate) btnGenerate.disabled = false;
            if (btnText) {
              btnText.classList.remove('hidden');
              btnText.textContent = '✅ Terminé';
            }
            if (btnLoader) btnLoader.classList.add('hidden');
            
            // Scroll
            if (diagnosticSection) {
              setTimeout(() => diagnosticSection.scrollIntoView({ behavior: 'smooth' }), 300);
            }
            
            resolve({ success: true, diagnostic: data });
          }
          
          // Timeout après max attempts
          if (attempts >= maxAttempts) {
            throw new Error('Timeout : Le diagnostic prend trop de temps. Réessayez.');
          }
          
        } catch (pollError) {
          console.error('❌ Erreur polling:', pollError);
          
          if (pollingInterval) {
            clearInterval(pollingInterval);
            pollingInterval = null;
          }
          
          reject(pollError);
        }
        
      }, 5000); // Toutes les 5 secondes
    });
    
  } catch (error) {
    console.error('❌ Erreur génération diagnostic:', error);
    
    // Arrêter le polling
    if (pollingInterval) {
      clearInterval(pollingInterval);
      pollingInterval = null;
    }
    
    // Afficher l'erreur
    const diagnosticContent = document.getElementById('diagnostic-content');
    if (diagnosticContent) {
      diagnosticContent.innerHTML = `
        <div style="padding: 40px; text-align: center; background: #fef2f2; border-radius: 12px; border: 2px solid #fecaca;">
          <div style="font-size: 64px; margin-bottom: 20px;">⚠️</div>
          <h3 style="color: #dc2626; margin-bottom: 16px;">Erreur</h3>
          <p style="color: #991b1b; margin-bottom: 24px;">${escapeHtml(error.message)}</p>
          <button onclick="generateDiagnostic('${consultationId}')" style="padding: 12px 24px; background: #2563eb; color: white; border: none; border-radius: 8px; cursor: pointer;">
            🔄 Réessayer
          </button>
        </div>
      `;
    }
    
    showToast('❌ ' + error.message, 'error');
    
    // Reset button
    const btnGenerate = document.getElementById('btn-generate-diagnostic');
    const btnText = document.getElementById('btn-diag-text');
    const btnLoader = document.getElementById('btn-diag-loader');
    
    if (btnGenerate) btnGenerate.disabled = false;
    if (btnText) {
      btnText.classList.remove('hidden');
      btnText.textContent = '🔄 Réessayer';
    }
    if (btnLoader) btnLoader.classList.add('hidden');
    
    return { success: false, error: error.message };
  }
}

/**
 * Afficher le diagnostic et le programme avec boutons d'action
 */
function displayDiagnosticWithActions(data, consultationId) {
  const diagnosticContent = document.getElementById('diagnostic-content');
  const programmeSection = document.getElementById('programme-section');
  const programmeContent = document.getElementById('programme-content');
  
  // Stocker les données dans une variable globale pour les modals
  window.currentDiagnosticData = data;
  window.currentConsultationId = consultationId;
  
  // CONTENEUR GRID POUR LES DEUX CARTES CÔTE À CÔTE
  const cardsContainer = `
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 20px;">
      <!-- CARTE DIAGNOSTIC -->
      <div onclick="openDiagnosticModal()" style="
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border-radius: 12px;
        padding: 24px;
        cursor: pointer;
        transition: transform 0.3s ease, box-shadow 0.3s ease;
        box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
        min-height: 180px;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
      " onmouseover="this.style.transform='translateY(-3px)'; this.style.boxShadow='0 8px 25px rgba(102, 126, 234, 0.4)'" onmouseout="this.style.transform=''; this.style.boxShadow='0 4px 15px rgba(102, 126, 234, 0.3)'">
        <div>
          <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
            </svg>
            <h3 style="color: white; font-size: 20px; font-weight: 700; margin: 0;">📋 Diagnostic</h3>
          </div>
          <p style="color: rgba(255,255,255,0.9); margin: 0; font-size: 14px; line-height: 1.5;">
            Diagnostic médical complet généré par IA
          </p>
        </div>
        <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-top: 16px;">
          <span style="background: rgba(255,255,255,0.2); color: white; padding: 6px 12px; border-radius: 16px; font-size: 12px; font-weight: 500;">
            ✅ Validé IA
          </span>
          <span style="background: rgba(255,255,255,0.2); color: white; padding: 6px 12px; border-radius: 16px; font-size: 12px; font-weight: 500;">
            📄 PDF
          </span>
        </div>
      </div>

      <!-- CARTE PROGRAMME -->
      <div onclick="openProgrammeModal()" style="
        background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
        border-radius: 12px;
        padding: 24px;
        cursor: pointer;
        transition: transform 0.3s ease, box-shadow 0.3s ease;
        box-shadow: 0 4px 15px rgba(245, 87, 108, 0.3);
        min-height: 180px;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
      " onmouseover="this.style.transform='translateY(-3px)'; this.style.boxShadow='0 8px 25px rgba(245, 87, 108, 0.4)'" onmouseout="this.style.transform=''; this.style.boxShadow='0 4px 15px rgba(245, 87, 108, 0.3)'">
        <div>
          <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
              <path d="M9 11l3 3L22 4"></path>
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
            </svg>
            <h3 style="color: white; font-size: 20px; font-weight: 700; margin: 0;">🏃 Programme</h3>
          </div>
          <p style="color: rgba(255,255,255,0.9); margin: 0; font-size: 14px; line-height: 1.5;">
            Rééducation personnalisée par phases
          </p>
        </div>
        <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-top: 16px;">
          <span style="background: rgba(255,255,255,0.2); color: white; padding: 6px 12px; border-radius: 16px; font-size: 12px; font-weight: 500;">
            ✅ Exercices
          </span>
          <span style="background: rgba(255,255,255,0.2); color: white; padding: 6px 12px; border-radius: 16px; font-size: 12px; font-weight: 500;">
            📄 PDF
          </span>
        </div>
      </div>
    </div>
  `;
  
  // AFFICHER LES CARTES CÔTE À CÔTE
  if (data.diagnostic_html && diagnosticContent) {
    diagnosticContent.innerHTML = cardsContainer;
  }
  
  // MASQUER LA SECTION PROGRAMME (tout est dans diagnostic-content maintenant)
  if (programmeSection) {
    programmeSection.classList.add('hidden');
  }
  
  // Créer les modals dans le DOM s'ils n'existent pas
  createDiagnosticModals();
}

/**
 * Créer les modals pour diagnostic et programme
 */
function createDiagnosticModals() {
  // Vérifier si les modals existent déjà
  if (!document.getElementById('modal-diagnostic')) {
    const modalDiagnostic = document.createElement('div');
    modalDiagnostic.id = 'modal-diagnostic';
    modalDiagnostic.className = 'modal-overlay';
    modalDiagnostic.style.display = 'none';
    modalDiagnostic.innerHTML = `
      <div class="modal" style="max-width: 1200px; width: 95%; max-height: 90vh; overflow-y: auto;">
        <div class="modal-header" style="position: sticky; top: 0; background: white; z-index: 10; border-bottom: 2px solid #e5e7eb; padding: 20px 30px;">
          <h3 class="modal-title" style="font-size: 24px; font-weight: 700; color: #1e293b;">📋 Diagnostic Médical</h3>
          <button class="modal-close" onclick="closeDiagnosticModal()" style="font-size: 32px; color: #64748b;">&times;</button>
        </div>
        <div class="modal-body" style="padding: 30px;">
          <div style="display: flex; justify-content: flex-end; gap: 12px; margin-bottom: 30px; position: sticky; top: 80px; background: white; padding: 16px 0; z-index: 5; border-bottom: 1px solid #f1f5f9;">
            <button onclick="toggleEditDiagnostic(window.currentConsultationId)" class="btn btn-ghost" id="btn-edit-diagnostic-modal">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
              ✏️ Éditer
            </button>
            <button onclick="exportDiagnosticPDF(window.currentConsultationId)" class="btn btn-primary">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
              📄 Export PDF
            </button>
          </div>
          <div id="diagnostic-html-content" style="line-height: 1.8; font-size: 16px;"></div>
        </div>
      </div>
    `;
    document.body.appendChild(modalDiagnostic);
  }
  
  if (!document.getElementById('modal-programme')) {
    const modalProgramme = document.createElement('div');
    modalProgramme.id = 'modal-programme';
    modalProgramme.className = 'modal-overlay';
    modalProgramme.style.display = 'none';
    modalProgramme.innerHTML = `
      <div class="modal" style="max-width: 1200px; width: 95%; max-height: 90vh; overflow-y: auto;">
        <div class="modal-header" style="position: sticky; top: 0; background: white; z-index: 10; border-bottom: 2px solid #e5e7eb; padding: 20px 30px;">
          <h3 class="modal-title" style="font-size: 24px; font-weight: 700; color: #1e293b;">🏃 Programme de Rééducation</h3>
          <button class="modal-close" onclick="closeProgrammeModal()" style="font-size: 32px; color: #64748b;">&times;</button>
        </div>
        <div class="modal-body" style="padding: 30px;">
          <div style="display: flex; justify-content: flex-end; gap: 12px; margin-bottom: 30px; position: sticky; top: 80px; background: white; padding: 16px 0; z-index: 5; border-bottom: 1px solid #f1f5f9;">
            <button onclick="toggleEditProgramme(window.currentConsultationId)" class="btn btn-ghost" id="btn-edit-programme-modal">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
              ✏️ Éditer
            </button>
            <button onclick="exportProgrammePDF(window.currentConsultationId)" class="btn btn-primary">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
              📄 Export PDF
            </button>
          </div>
          <div id="programme-html-content" style="line-height: 1.8; font-size: 16px;"></div>
        </div>
      </div>
    `;
    document.body.appendChild(modalProgramme);
  }
}

/**
 * Ouvrir modal diagnostic
 */
function openDiagnosticModal() {
  const modal = document.getElementById('modal-diagnostic');
  const content = modal.querySelector('#diagnostic-html-content');
  
  if (window.currentDiagnosticData && window.currentDiagnosticData.diagnostic_html) {
    content.innerHTML = window.currentDiagnosticData.diagnostic_html;
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  }
}

/**
 * Fermer modal diagnostic
 */
function closeDiagnosticModal() {
  const modal = document.getElementById('modal-diagnostic');
  modal.style.display = 'none';
  document.body.style.overflow = '';
  
  // Désactiver l'édition si elle est active
  const content = modal.querySelector('#diagnostic-html-content');
  if (content && content.contentEditable === 'true') {
    content.contentEditable = 'false';
    content.style.border = 'none';
    content.style.padding = '0';
  }
}

/**
 * Ouvrir modal programme
 */
function openProgrammeModal() {
  const modal = document.getElementById('modal-programme');
  const content = modal.querySelector('#programme-html-content');
  
  if (window.currentDiagnosticData && window.currentDiagnosticData.programme_html) {
    content.innerHTML = window.currentDiagnosticData.programme_html;
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  }
}

/**
 * Fermer modal programme
 */
function closeProgrammeModal() {
  const modal = document.getElementById('modal-programme');
  modal.style.display = 'none';
  document.body.style.overflow = '';
  
  // Désactiver l'édition si elle est active
  const content = modal.querySelector('#programme-html-content');
  if (content && content.contentEditable === 'true') {
    content.contentEditable = 'false';
    content.style.border = 'none';
    content.style.padding = '0';
  }
}

/**
 * Activer l'édition du diagnostic
 */
function toggleEditDiagnostic(consultationId) {
  const content = document.getElementById('diagnostic-html-content');
  const btnEdit = document.getElementById('btn-edit-diagnostic-modal');
  
  if (!content || !btnEdit) return;
  
  const isEditing = content.contentEditable === 'true';
  
  if (isEditing) {
    // Sauvegarder
    saveDiagnosticEdit(consultationId, content.innerHTML);
    content.contentEditable = 'false';
    content.style.border = 'none';
    content.style.padding = '0';
    content.style.borderRadius = '0';
    btnEdit.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
      </svg>
      ✏️ Éditer
    `;
    btnEdit.className = 'btn btn-ghost';
  } else {
    // Activer édition
    content.contentEditable = 'true';
    content.style.border = '3px dashed #0ea5e9';
    content.style.padding = '24px';
    content.style.borderRadius = '12px';
    content.style.background = '#f8fafc';
    content.focus();
    btnEdit.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>
      💾 Sauvegarder
    `;
    btnEdit.className = 'btn btn-primary';
  }
}

/**
 * Activer l'édition du programme
 */
function toggleEditProgramme(consultationId) {
  const content = document.getElementById('programme-html-content');
  const btnEdit = document.getElementById('btn-edit-programme-modal');
  
  if (!content || !btnEdit) return;
  
  const isEditing = content.contentEditable === 'true';
  
  if (isEditing) {
    // Sauvegarder
    saveProgrammeEdit(consultationId, content.innerHTML);
    content.contentEditable = 'false';
    content.style.border = 'none';
    content.style.padding = '0';
    content.style.borderRadius = '0';
    btnEdit.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
      </svg>
      ✏️ Éditer
    `;
    btnEdit.className = 'btn btn-ghost';
  } else {
    // Activer édition
    content.contentEditable = 'true';
    content.style.border = '3px dashed #f5576c';
    content.style.padding = '24px';
    content.style.borderRadius = '12px';
    content.style.background = '#fef2f2';
    content.focus();
    btnEdit.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>
      💾 Sauvegarder
    `;
    btnEdit.className = 'btn btn-primary';
  }
}

/**
 * Sauvegarder les modifications du diagnostic
 */
async function saveDiagnosticEdit(consultationId, newHtml) {
  try {
    showToast('Sauvegarde en cours...', 'info');
    
    const client = getSupabaseClient();
    const { error } = await client
      .from('diagnostic_reports')
      .update({
        diagnostic_html: newHtml,
        updated_at: new Date().toISOString()
      })
      .eq('consultation_id', consultationId)
      .order('created_at', { ascending: false })
      .limit(1);
    
    if (error) throw error;
    
    showToast('✅ Diagnostic sauvegardé', 'success');
  } catch (error) {
    console.error('Erreur sauvegarde:', error);
    showToast('Erreur lors de la sauvegarde', 'error');
  }
}

/**
 * Sauvegarder les modifications du programme
 */
async function saveProgrammeEdit(consultationId, newHtml) {
  try {
    showToast('Sauvegarde en cours...', 'info');
    
    const client = getSupabaseClient();
    const { error } = await client
      .from('diagnostic_reports')
      .update({
        programme_html: newHtml,
        updated_at: new Date().toISOString()
      })
      .eq('consultation_id', consultationId)
      .order('created_at', { ascending: false })
      .limit(1);
    
    if (error) throw error;
    
    showToast('✅ Programme sauvegardé', 'success');
  } catch (error) {
    console.error('Erreur sauvegarde:', error);
    showToast('Erreur lors de la sauvegarde', 'error');
  }
}