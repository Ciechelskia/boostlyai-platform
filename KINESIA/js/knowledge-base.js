/* ===================================
   KINESIA - Knowledge Base Management
   Gestion de la base de connaissances (PDF)
   =================================== */

let uploadedFiles = [];

document.addEventListener('DOMContentLoaded', async () => {
  // Vérifier authentification
  const authenticated = await requireAuth();
  if (!authenticated) return;
  
  // Charger les documents
  await loadDocuments();
  
  // Initialiser les événements
  initEvents();
  
  // Initialiser le drag & drop
  initDragDrop();
});

/**
 * Initialiser les événements
 */
function initEvents() {
  // Upload de fichier
  const pdfInput = document.getElementById('pdf-input');
  if (pdfInput) {
    pdfInput.addEventListener('change', handleFileSelect);
  }
  
  // Filtres
  const categoryFilter = document.getElementById('category-filter');
  if (categoryFilter) {
    categoryFilter.addEventListener('change', filterDocuments);
  }
  
  const searchInput = document.getElementById('search-documents');
  if (searchInput) {
    searchInput.addEventListener('input', debounce(filterDocuments, 300));
  }
}

/**
 * Initialiser le drag & drop
 */
function initDragDrop() {
  const uploadBox = document.getElementById('upload-box');
  
  if (!uploadBox) return;
  
  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    uploadBox.addEventListener(eventName, preventDefaults, false);
  });
  
  function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  }
  
  ['dragenter', 'dragover'].forEach(eventName => {
    uploadBox.addEventListener(eventName, () => {
      uploadBox.classList.add('drag-over');
    }, false);
  });
  
  ['dragleave', 'drop'].forEach(eventName => {
    uploadBox.addEventListener(eventName, () => {
      uploadBox.classList.remove('drag-over');
    }, false);
  });
  
  uploadBox.addEventListener('drop', handleDrop, false);
}

/**
 * Gérer le drop de fichiers
 */
function handleDrop(e) {
  const dt = e.dataTransfer;
  const files = dt.files;
  handleFiles(files);
}

/**
 * Gérer la sélection de fichiers
 */
function handleFileSelect(e) {
  const files = e.target.files;
  handleFiles(files);
}

/**
 * Gérer les fichiers uploadés
 */
async function handleFiles(files) {
  const validFiles = Array.from(files).filter(file => {
    if (file.type !== 'application/pdf') {
      showToast(`${file.name} n'est pas un PDF`, 'error');
      return false;
    }
    if (file.size > CONFIG.MAX_FILE_SIZE_PDF) {
      showToast(`${file.name} est trop volumineux (max 20 MB)`, 'error');
      return false;
    }
    return true;
  });
  
  if (validFiles.length === 0) return;
  
  // Upload des fichiers
  for (const file of validFiles) {
    await uploadDocument(file);
  }
  
  // Recharger la liste
  await loadDocuments();
}

/**
 * Upload un document PDF
 */
async function uploadDocument(file) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error('Utilisateur non authentifié');
    
    // Afficher la progression
    showUploadProgress(file.name);
    
    // 1. Upload vers Storage
    const uploadResult = await uploadKnowledgePDF(file, user.id);
    
    if (!uploadResult.success) {
      throw new Error(uploadResult.error);
    }
    
    updateUploadProgress(50, `Extraction du texte de ${file.name}...`);
    
    // 2. Extraire le texte du PDF (simplifié - à améliorer)
    // TODO: Implémenter l'extraction via N8N ou PDF.js
    const extractedText = `Contenu du document ${file.name}`;
    
    updateUploadProgress(75, `Création des embeddings...`);
    
    // 3. Créer l'embedding (via N8N ou API OpenAI)
    // TODO: Implémenter l'appel N8N pour créer l'embedding
    const embedding = null; // Sera créé côté N8N
    
    updateUploadProgress(90, `Sauvegarde dans la base...`);
    
    // 4. Sauvegarder dans Supabase
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('knowledge_base')
      .insert({
        user_id: user.id,
        title: file.name.replace('.pdf', ''),
        category: 'cours', // Par défaut
        file_url: uploadResult.url,
        file_name: uploadResult.fileName,
        file_size_bytes: uploadResult.fileSize,
        content_text: extractedText,
        created_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) throw error;
    
    updateUploadProgress(100, `${file.name} ajouté !`);
    
    setTimeout(() => {
      hideUploadProgress();
    }, 2000);
    
    console.log('✅ Document ajouté:', data.id);
    showToast(`${file.name} ajouté avec succès`, 'success');
    
  } catch (error) {
    console.error('❌ Erreur upload document:', error);
    showToast(`Erreur lors de l'ajout de ${file.name}`, 'error');
    hideUploadProgress();
  }
}

/**
 * Afficher la progression d'upload
 */
function showUploadProgress(fileName) {
  const progressContainer = document.getElementById('upload-progress');
  const progressText = document.getElementById('progress-text');
  
  if (progressContainer) {
    progressContainer.classList.remove('hidden');
    progressText.textContent = `Upload de ${fileName}...`;
  }
}

/**
 * Mettre à jour la progression
 */
function updateUploadProgress(percentage, message) {
  const progressFill = document.getElementById('progress-fill');
  const progressText = document.getElementById('progress-text');
  
  if (progressFill) {
    progressFill.style.width = percentage + '%';
  }
  if (progressText) {
    progressText.textContent = message;
  }
}

/**
 * Masquer la progression
 */
function hideUploadProgress() {
  const progressContainer = document.getElementById('upload-progress');
  if (progressContainer) {
    progressContainer.classList.add('hidden');
  }
}

/**
 * Charger les documents
 */
async function loadDocuments() {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error('Utilisateur non authentifié');
    
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('knowledge_base')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    uploadedFiles = data;
    
    // Mettre à jour les stats
    updateStats(data);
    
    // Afficher les documents
    displayDocuments(data);
    
  } catch (error) {
    console.error('❌ Erreur chargement documents:', error);
    showToast('Erreur lors du chargement des documents', 'error');
  }
}

/**
 * Mettre à jour les statistiques
 */
function updateStats(documents) {
  const totalDocuments = document.getElementById('total-documents');
  const totalSize = document.getElementById('total-size');
  const totalCategories = document.getElementById('total-categories');
  
  if (totalDocuments) {
    totalDocuments.textContent = documents.length;
  }
  
  if (totalSize) {
    const totalBytes = documents.reduce((sum, doc) => sum + (doc.file_size_bytes || 0), 0);
    totalSize.textContent = formatFileSize(totalBytes);
  }
  
  if (totalCategories) {
    const categories = new Set(documents.map(doc => doc.category));
    totalCategories.textContent = categories.size;
  }
}

/**
 * Afficher les documents
 */
function displayDocuments(documents) {
  const documentsGrid = document.getElementById('documents-grid');
  
  if (!documentsGrid) return;
  
  if (documents.length === 0) {
    documentsGrid.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📚</div>
        <h3 class="empty-state-title">Aucun document</h3>
        <p class="empty-state-desc">Ajoutez vos premiers cours et formations</p>
      </div>
    `;
    return;
  }
  
  documentsGrid.innerHTML = '';
  
  documents.forEach(doc => {
    const card = createDocumentCard(doc);
    documentsGrid.appendChild(card);
  });
}

/**
 * Créer une card de document
 */
function createDocumentCard(doc) {
  const card = document.createElement('div');
  card.className = 'card document-card';
  
  card.innerHTML = `
    <div class="document-icon">📄</div>
    <h4 class="document-title">${escapeHtml(doc.title)}</h4>
    <div class="document-meta">
      <span class="badge badge-primary">${doc.category || 'cours'}</span>
      <span>${formatFileSize(doc.file_size_bytes)}</span>
    </div>
    <div class="document-date">${formatRelativeDate(doc.created_at)}</div>
    <div class="document-actions">
      <button class="btn btn-ghost btn-sm" onclick="viewDocument('${doc.id}')">
        Voir
      </button>
      <button class="btn btn-ghost btn-sm" onclick="deleteDocument('${doc.id}')">
        Supprimer
      </button>
    </div>
  `;
  
  return card;
}

/**
 * Filtrer les documents
 */
function filterDocuments() {
  const category = document.getElementById('category-filter')?.value || 'all';
  const search = document.getElementById('search-documents')?.value.toLowerCase() || '';
  
  let filtered = uploadedFiles;
  
  if (category !== 'all') {
    filtered = filtered.filter(doc => doc.category === category);
  }
  
  if (search) {
    filtered = filtered.filter(doc => 
      doc.title.toLowerCase().includes(search) ||
      (doc.content_text && doc.content_text.toLowerCase().includes(search))
    );
  }
  
  displayDocuments(filtered);
}

/**
 * Voir un document
 */
function viewDocument(docId) {
  const doc = uploadedFiles.find(d => d.id === docId);
  if (doc && doc.file_url) {
    window.open(doc.file_url, '_blank');
  }
}

/**
 * Supprimer un document
 */
async function deleteDocument(docId) {
  if (!confirm('Êtes-vous sûr de vouloir supprimer ce document ?')) {
    return;
  }
  
  try {
    const doc = uploadedFiles.find(d => d.id === docId);
    if (!doc) return;
    
    // Supprimer de Storage
    const pathMatch = doc.file_url.match(/knowledge-base\/(.+)$/);
    if (pathMatch) {
      await deleteKnowledgePDF(pathMatch[1]);
    }
    
    // Supprimer de la base
    const client = getSupabaseClient();
    const { error } = await client
      .from('knowledge_base')
      .delete()
      .eq('id', docId);
    
    if (error) throw error;
    
    showToast('Document supprimé', 'success');
    await loadDocuments();
    
  } catch (error) {
    console.error('❌ Erreur suppression:', error);
    showToast('Erreur lors de la suppression', 'error');
  }
}