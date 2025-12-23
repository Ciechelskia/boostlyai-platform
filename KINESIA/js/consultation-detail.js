/* ===================================
   KINESIA - Consultation Detail Logic
   Page consultation.html
   =================================== */

let currentConsultation = null;

document.addEventListener('DOMContentLoaded', async () => {
  // Vérifier authentification
  const authenticated = await requireAuth();
  if (!authenticated) return;
  
  // Récupérer l'ID de la consultation depuis l'URL
  const urlParams = new URLSearchParams(window.location.search);
  const consultationId = urlParams.get('id');
  
  if (!consultationId) {
    showToast('ID de consultation manquant', 'error');
    window.location.href = '/app.html';
    return;
  }
  
  console.log('📋 Chargement consultation:', consultationId);
  
  // Charger la consultation
  await loadConsultation(consultationId);
  
  // Initialiser les tabs
  initTabs();
  
  // Initialiser les boutons d'actions
  initActions(consultationId);
});

/**
 * Charger les détails de la consultation
 */
async function loadConsultation(consultationId) {
  try {
    const loadingState = document.getElementById('loadingState');
    const consultationContent = document.getElementById('consultationContent');
    
    if (loadingState) loadingState.style.display = 'flex';
    if (consultationContent) consultationContent.style.display = 'none';
    
    const result = await getConsultationById(consultationId);
    
    if (!result.success) {
      throw new Error(result.error);
    }
    
    currentConsultation = result.consultation;
    
    // Afficher les informations de la consultation
    displayConsultationInfo(currentConsultation);
    
    // Afficher le résumé
    if (currentConsultation.summaries && currentConsultation.summaries.length > 0) {
      displaySummary(currentConsultation.summaries[0]);
    }
    
    // Afficher la transcription
    if (currentConsultation.transcripts && currentConsultation.transcripts.length > 0) {
      displayTranscript(currentConsultation.transcripts[0]);
    }
    
    if (loadingState) loadingState.style.display = 'none';
    if (consultationContent) consultationContent.style.display = 'block';
    
  } catch (error) {
    console.error('Erreur chargement consultation:', error);
    showToast('Erreur lors du chargement de la consultation', 'error');
    setTimeout(() => {
      window.location.href = '/app.html';
    }, 2000);
  }
}

/**
 * Afficher les informations de la consultation
 */
function displayConsultationInfo(consultation) {
  const titleEl = document.getElementById('consultationTitle');
  const dateEl = document.getElementById('consultationDate');
  const typeEl = document.getElementById('consultationType');
  const durationEl = document.getElementById('consultationDuration');
  const statusEl = document.getElementById('consultationStatus');
  
  if (titleEl) titleEl.textContent = consultation.title;
  if (dateEl) dateEl.textContent = '📅 ' + formatDate(consultation.created_at);
  if (typeEl) typeEl.textContent = consultation.consultation_type || 'Consultation';
  if (durationEl) durationEl.textContent = '⏱️ ' + (consultation.duration_seconds ? formatDuration(consultation.duration_seconds) : 'N/A');
  
  const statusBadge = getConsultationStatusBadge(consultation.status);
  if (statusEl) {
    statusEl.textContent = statusBadge.text;
    statusEl.className = 'badge ' + statusBadge.class;
  }
  
  // Afficher l'objectif si présent
  if (consultation.objective) {
    const objectiveRow = document.getElementById('objectiveRow');
    const objectiveText = document.getElementById('objectiveText');
    if (objectiveRow) objectiveRow.style.display = 'flex';
    if (objectiveText) objectiveText.textContent = consultation.objective;
  }
  
  // Afficher le nom du patient si présent
  if (consultation.patient_name) {
    const participantsRow = document.getElementById('participantsRow');
    const participantsList = document.getElementById('participantsList');
    
    if (participantsRow) participantsRow.style.display = 'flex';
    
    if (participantsList) {
      const chip = document.createElement('div');
      chip.className = 'participant-chip';
      chip.textContent = '👤 ' + consultation.patient_name;
      participantsList.appendChild(chip);
    }
  }
}

/**
 * Afficher le résumé
 */
function displaySummary(summary) {
  // Résumé exécutif
  const executiveSummaryEl = document.getElementById('executiveSummary');
  if (executiveSummaryEl) {
    executiveSummaryEl.textContent = summary.executive_summary || 'Aucun résumé disponible';
  }
  
  // Points clés
  if (summary.key_points && summary.key_points.length > 0) {
    const keyPointsList = document.getElementById('keyPointsList');
    if (keyPointsList) {
      keyPointsList.innerHTML = '';
      summary.key_points.forEach((point, index) => {
        const item = createListItem(index + 1, point);
        keyPointsList.appendChild(item);
      });
    }
  }
  
  // Décisions
  if (summary.decisions_made && summary.decisions_made.length > 0) {
    const decisionsList = document.getElementById('decisionsList');
    if (decisionsList) {
      decisionsList.innerHTML = '';
      summary.decisions_made.forEach((decision, index) => {
        const item = createListItem(index + 1, decision);
        decisionsList.appendChild(item);
      });
    }
  }
  
  // Actions
  if (summary.action_items && summary.action_items.length > 0) {
    const actionsList = document.getElementById('actionsList');
    const actionsBadge = document.getElementById('actionsBadge');
    
    if (actionsList) {
      actionsList.innerHTML = '';
      summary.action_items.forEach((action) => {
        const item = createActionItem(action);
        actionsList.appendChild(item);
      });
    }
    
    if (actionsBadge) {
      actionsBadge.textContent = summary.action_items.length;
    }
  }
  
  // Prochaines étapes
  if (summary.next_steps && summary.next_steps.length > 0) {
    const nextStepsList = document.getElementById('nextStepsList');
    if (nextStepsList) {
      nextStepsList.innerHTML = '';
      summary.next_steps.forEach((step, index) => {
        const item = createListItem(index + 1, step);
        nextStepsList.appendChild(item);
      });
    }
  }
  
  // Mots-clés
  if (summary.keywords && summary.keywords.length > 0) {
    const keywordsSection = document.getElementById('keywordsSection');
    const keywordsList = document.getElementById('keywordsList');
    
    if (keywordsSection) keywordsSection.style.display = 'block';
    
    if (keywordsList) {
      keywordsList.innerHTML = '';
      summary.keywords.forEach((keyword) => {
        const tag = document.createElement('div');
        tag.className = 'keyword-tag';
        tag.textContent = keyword;
        keywordsList.appendChild(tag);
      });
    }
  }
  
  // Sentiment
  if (summary.sentiment_analysis) {
    const sentimentSection = document.getElementById('sentimentSection');
    const sentimentLabel = document.getElementById('sentimentLabel');
    const sentimentScore = document.getElementById('sentimentScore');
    const sentimentBar = document.getElementById('sentimentBar');
    
    if (sentimentSection) sentimentSection.style.display = 'block';
    if (sentimentLabel) sentimentLabel.textContent = summary.sentiment_analysis.overall || 'Neutre';
    if (sentimentScore) sentimentScore.textContent = (summary.sentiment_analysis.score || 0) + '%';
    if (sentimentBar) sentimentBar.style.width = (summary.sentiment_analysis.score || 0) + '%';
  }
}

/**
 * Afficher la transcription
 */
function displayTranscript(transcript) {
  const transcriptContent = document.getElementById('transcriptContent');
  if (transcriptContent) {
    transcriptContent.textContent = transcript.raw_text || 'Aucune transcription disponible';
  }
}

/**
 * Créer un élément de liste
 */
function createListItem(number, text) {
  const item = document.createElement('div');
  item.className = 'list-item';
  
  const icon = document.createElement('div');
  icon.className = 'list-item-icon';
  icon.textContent = number;
  
  const content = document.createElement('div');
  content.className = 'list-item-content';
  content.textContent = text;
  
  item.appendChild(icon);
  item.appendChild(content);
  
  return item;
}

/**
 * Créer un élément d'action
 */
function createActionItem(action) {
  const item = document.createElement('div');
  item.className = 'action-item';
  
  const text = typeof action === 'string' ? action : action.action || action.text || '';
  
  const header = document.createElement('div');
  header.className = 'action-item-header';
  
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.className = 'action-checkbox';
  
  header.appendChild(checkbox);
  
  const actionText = document.createElement('div');
  actionText.className = 'action-text';
  actionText.textContent = text;
  
  item.appendChild(header);
  item.appendChild(actionText);
  
  return item;
}

/**
 * Initialiser les tabs
 */
function initTabs() {
  const tabs = document.querySelectorAll('.tab');
  const tabContents = document.querySelectorAll('.tab-content');
  
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const tabName = tab.dataset.tab;
      
      // Désactiver tous les tabs
      tabs.forEach(t => t.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));
      
      // Activer le tab cliqué
      tab.classList.add('active');
      const tabContent = document.getElementById('tab-' + tabName);
      if (tabContent) tabContent.classList.add('active');
    });
  });
}

/**
 * Initialiser les actions
 */
function initActions(consultationId) {
  // Bouton Générer Diagnostic
  const btnGenerateDiagnostic = document.getElementById('btn-generate-diagnostic');
  if (btnGenerateDiagnostic) {
    btnGenerateDiagnostic.addEventListener('click', async () => {
      console.log('🚀 Génération diagnostic pour consultation:', consultationId);
      await generateDiagnostic(consultationId);
    });
  }
  
  // Bouton Réessayer Diagnostic
  const btnRetryDiagnostic = document.getElementById('btn-retry-diagnostic');
  if (btnRetryDiagnostic) {
    btnRetryDiagnostic.addEventListener('click', async () => {
      console.log('🔄 Nouvelle tentative de génération diagnostic:', consultationId);
      await generateDiagnostic(consultationId);
    });
  }
  
  // Bouton Export PDF
  const btnExportPDF = document.getElementById('btnExportPDF');
  if (btnExportPDF) {
    btnExportPDF.addEventListener('click', async () => {
      showToast('Export PDF en cours...', 'info');
      // TODO: Implémenter l'export PDF
    });
  }
  
  // Bouton Partager
  const btnShare = document.getElementById('btnShare');
  if (btnShare) {
    btnShare.addEventListener('click', () => {
      const modalShare = document.getElementById('modalShare');
      if (modalShare) modalShare.style.display = 'flex';
    });
  }
  
  // Générer lien de partage
  const btnGenerateLink = document.getElementById('btnGenerateLink');
  if (btnGenerateLink) {
    btnGenerateLink.addEventListener('click', async () => {
      const shareExpiry = document.getElementById('shareExpiry');
      const expiry = shareExpiry ? parseInt(shareExpiry.value) : 7;
      
      const result = await createShareLink(currentConsultation.id, expiry);
      
      if (result.success) {
        const shareLinkInput = document.getElementById('shareLink');
        const shareLinkContainer = document.getElementById('shareLinkContainer');
        
        if (shareLinkInput) shareLinkInput.value = result.shareUrl;
        if (shareLinkContainer) shareLinkContainer.style.display = 'block';
        
        await copyToClipboard(result.shareUrl);
        showToast('Lien copié dans le presse-papier !', 'success');
      } else {
        showToast('Erreur création du lien', 'error');
      }
    });
  }
  
  // Copier transcription
  const btnCopyTranscript = document.getElementById('btnCopyTranscript');
  if (btnCopyTranscript) {
    btnCopyTranscript.addEventListener('click', async () => {
      const transcriptContent = document.getElementById('transcriptContent');
      const text = transcriptContent ? transcriptContent.textContent : '';
      const copied = await copyToClipboard(text);
      
      if (copied) {
        showToast('Transcription copiée !', 'success');
      } else {
        showToast('Erreur lors de la copie', 'error');
      }
    });
  }
}

/**
 * Fermer le modal de partage
 */
function closeShareModal() {
  const modalShare = document.getElementById('modalShare');
  const shareLinkContainer = document.getElementById('shareLinkContainer');
  
  if (modalShare) modalShare.style.display = 'none';
  if (shareLinkContainer) shareLinkContainer.style.display = 'none';
}