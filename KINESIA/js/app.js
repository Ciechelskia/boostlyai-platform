/* ===================================
   KINESIA - App Dashboard Logic
   Page app.html - VERSION CORRIGÉE
   =================================== */

let currentUser = null;

document.addEventListener('DOMContentLoaded', async () => {
  // Vérifier authentification
  const authenticated = await requireAuth();
  if (!authenticated) return;
  
  // Charger l'utilisateur
  currentUser = await getCurrentUser();
  
  // Initialiser le dashboard
  await initDashboard();
  
  // Charger les consultations
  await loadConsultations();
  
  // Initialiser les événements
  initEvents();
});

/**
 * Initialiser le dashboard
 */
async function initDashboard() {
  try {
    // Récupérer le profil
    const profile = await getUserProfile(currentUser.id);
    
    if (profile && profile.full_name) {
      // Afficher le nom dans la sidebar
      const userNameDisplay = document.getElementById('userNameDisplay');
      if (userNameDisplay) {
        userNameDisplay.textContent = profile.full_name;
      }
      
      // Afficher le prénom dans le header
      const userFirstName = document.getElementById('userFirstName');
      if (userFirstName) {
        const firstName = profile.full_name.split(' ')[0];
        userFirstName.textContent = firstName;
      }
      
      // Afficher les initiales dans l'avatar
      const userAvatarSidebar = document.getElementById('userAvatarSidebar');
      if (userAvatarSidebar) {
        userAvatarSidebar.textContent = getInitials(profile.full_name);
      }
    }
    
    // Afficher l'email
    const userEmailDisplay = document.getElementById('userEmailDisplay');
    if (userEmailDisplay && currentUser.email) {
      userEmailDisplay.textContent = currentUser.email;
    }
    
    // Charger les statistiques
    await loadStats();
    
  } catch (error) {
    console.error('Erreur init dashboard:', error);
    // Ne pas bloquer l'app si le profil n'est pas accessible
  }
}

/**
 * Charger les statistiques
 */
async function loadStats() {
  try {
    const result = await getUserStats();
    
    if (result.success) {
      const stats = result.stats;
      
      // Total consultations
      const totalEl = document.getElementById('totalConsultations');
      if (totalEl) {
        totalEl.textContent = stats.totalConsultations;
      }
      
      // Consultations ce mois
      const monthEl = document.getElementById('monthConsultations');
      if (monthEl) {
        monthEl.textContent = stats.monthConsultations;
      }
      
      // Durée totale
      const durationEl = document.getElementById('totalDuration');
      if (durationEl) {
        durationEl.textContent = formatDuration(stats.totalDuration);
      }
      
      // Quota
      const quotaEl = document.getElementById('quotaUsage');
      if (quotaEl) {
        quotaEl.textContent = formatQuota(stats.quota);
      }
      
      const quotaDisplay = document.getElementById('quotaDisplay');
      if (quotaDisplay) {
        quotaDisplay.textContent = formatQuota(stats.quota);
      }
    }
  } catch (error) {
    console.error('Erreur chargement stats:', error);
  }
}

/**
 * Charger les consultations
 */
async function loadConsultations(filters = {}) {
  try {
    const consultationsGrid = document.getElementById('consultationsGrid');
    if (!consultationsGrid) return;
    
    consultationsGrid.innerHTML = '<div style="text-align: center; padding: 40px;"><div class="spinner"></div></div>';
    
    const result = await getConsultations(filters);
    
    if (result.success) {
      displayConsultations(result.consultations);
    } else {
      throw new Error(result.error);
    }
  } catch (error) {
    console.error('Erreur chargement consultations:', error);
    const consultationsGrid = document.getElementById('consultationsGrid');
    if (consultationsGrid) {
      consultationsGrid.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">⚠️</div>
          <h3 class="empty-state-title">Erreur de chargement</h3>
          <p class="empty-state-desc">${error.message}</p>
          <button class="btn btn-primary" onclick="loadConsultations()">Réessayer</button>
        </div>
      `;
    }
  }
}

/**
 * Afficher les consultations
 */
function displayConsultations(consultations) {
  const consultationsGrid = document.getElementById('consultationsGrid');
  if (!consultationsGrid) return;
  
  if (consultations.length === 0) {
    consultationsGrid.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🩺</div>
        <h3 class="empty-state-title">Aucune consultation</h3>
        <p class="empty-state-desc">Commencez par créer votre première consultation</p>
        <button class="btn btn-primary" onclick="window.location.href='/new-consultation.html'">
          Nouvelle consultation
        </button>
      </div>
    `;
    return;
  }
  
  consultationsGrid.innerHTML = '';
  
  consultations.forEach(consultation => {
    const card = createConsultationCard(consultation);
    consultationsGrid.appendChild(card);
  });
}

/**
 * Créer une card de consultation
 */
function createConsultationCard(consultation) {
  const card = document.createElement('div');
  card.className = 'consultation-card';
  card.onclick = () => {
    window.location.href = `/consultation.html?id=${consultation.id}`;
  };
  
  const statusBadge = getConsultationStatusBadge(consultation.status);
  
  card.innerHTML = `
    <div class="consultation-icon">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3"></path>
        <path d="M8 15v1a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6v-4"></path>
        <circle cx="20" cy="10" r="2"></circle>
      </svg>
    </div>
    <h3 class="consultation-title">${escapeHtml(consultation.title)}</h3>
    <div class="consultation-meta">
      <span>📅 ${formatRelativeDate(consultation.created_at)}</span>
      ${consultation.patient_name ? `<span>👤 ${escapeHtml(consultation.patient_name)}</span>` : ''}
    </div>
    <div class="consultation-footer">
      <span>${consultation.consultation_type || 'Consultation'}</span>
      <span class="badge ${statusBadge.class}">${statusBadge.text}</span>
    </div>
  `;
  
  return card;
}

/**
 * Initialiser les événements
 */
function initEvents() {
  // Filtres
  const filterStatus = document.getElementById('filterStatus');
  if (filterStatus) {
    filterStatus.addEventListener('change', applyFilters);
  }
  
  const filterType = document.getElementById('filterType');
  if (filterType) {
    filterType.addEventListener('change', applyFilters);
  }
  
  // Recherche
  const searchInput = document.getElementById('searchConsultations');
  if (searchInput) {
    searchInput.addEventListener('input', debounce(applyFilters, 500));
  }
}

/**
 * Appliquer les filtres
 */
function applyFilters() {
  const filters = {};
  
  const filterStatus = document.getElementById('filterStatus');
  if (filterStatus && filterStatus.value) {
    filters.status = filterStatus.value;
  }
  
  const filterType = document.getElementById('filterType');
  if (filterType && filterType.value) {
    filters.type = filterType.value;
  }
  
  const searchInput = document.getElementById('searchConsultations');
  if (searchInput && searchInput.value) {
    filters.search = searchInput.value;
  }
  
  loadConsultations(filters);
}