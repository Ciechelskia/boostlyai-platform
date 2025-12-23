/* ===================================
   KINESIA - Utility Functions
   Fonctions utilitaires réutilisables
   =================================== */

// ===================================
// DATE & TIME FUNCTIONS
// ===================================

/**
 * Formater une date
 */
function formatDate(dateString, options = {}) {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  const defaultOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    ...options
  };
  
  return date.toLocaleDateString('fr-FR', defaultOptions);
}

/**
 * Formater une date relative (Il y a X minutes/heures/jours)
 */
function formatRelativeDate(dateString) {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return 'À l\'instant';
  if (diffMins < 60) return `Il y a ${diffMins} min`;
  if (diffHours < 24) return `Il y a ${diffHours}h`;
  if (diffDays < 7) return `Il y a ${diffDays}j`;
  
  return formatDate(dateString, { day: 'numeric', month: 'short' });
}

/**
 * Formater une durée en secondes vers format lisible
 */
function formatDuration(seconds) {
  if (!seconds || seconds < 0) return '0min';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes}min`;
  }
  return `${minutes}min`;
}

// ===================================
// FILE FUNCTIONS
// ===================================

/**
 * Formater la taille d'un fichier
 */
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// ===================================
// USER FUNCTIONS
// ===================================

/**
 * Obtenir les initiales d'un nom
 */
function getInitials(name) {
  if (!name) return '?';
  
  const parts = name.trim().split(' ');
  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }
  
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Générer une couleur d'avatar basée sur le nom
 */
function getAvatarColor(name) {
  if (!name) return 'var(--primary)';
  
  const colors = [
    'var(--primary)',
    'var(--accent)',
    '#3B82F6', // blue
    '#10B981', // green
    '#F59E0B', // amber
    '#EF4444', // red
    '#8B5CF6', // purple
    '#EC4899'  // pink
  ];
  
  const hash = name.split('').reduce((acc, char) => {
    return char.charCodeAt(0) + ((acc << 5) - acc);
  }, 0);
  
  return colors[Math.abs(hash) % colors.length];
}

// ===================================
// VALIDATION FUNCTIONS
// ===================================

/**
 * Valider un email
 */
function isValidEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

// ===================================
// CLIPBOARD FUNCTIONS
// ===================================

/**
 * Copier du texte dans le presse-papier
 */
async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.error('Erreur copie:', err);
    return false;
  }
}

// ===================================
// DOWNLOAD FUNCTIONS
// ===================================

/**
 * Télécharger un fichier
 */
function downloadFile(blob, filename) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

// ===================================
// DEBOUNCE & THROTTLE
// ===================================

/**
 * Debounce function
 */
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function
 */
function throttle(func, limit) {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// ===================================
// UUID GENERATOR
// ===================================

/**
 * Générer un UUID simple (v4)
 */
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Échapper le HTML pour éviter les XSS
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Afficher une notification toast
 */
function showToast(message, type = 'info', duration = 3000) {
  // Créer l'élément toast
  const toast = document.createElement('div');
  toast.className = `toast alert-${type}`;
  toast.textContent = message;
  
  // Ajouter au DOM
  document.body.appendChild(toast);
  
  // Retirer après la durée spécifiée
  setTimeout(() => {
    toast.style.animation = 'fadeOut 0.3s ease-out';
    setTimeout(() => {
      document.body.removeChild(toast);
    }, 300);
  }, duration);
}

/**
 * Vérifier si l'utilisateur a atteint son quota
 * ✅ VERSION ILLIMITÉE - Toujours autorisé
 */
function checkQuota(profile) {
  const used = profile?.consultations_used_this_month || 0;
  
  // ✅ TOUJOURS ILLIMITÉ POUR TOUS LES UTILISATEURS
  return {
    canCreateConsultation: true, // ✅ Toujours autorisé
    remaining: -1, // -1 = illimité
    total: -1, // -1 = illimité
    used: used
  };
}

/**
 * Formater le quota pour affichage
 */
function formatQuota(quota) {
  if (quota.total === -1) {
    return 'Illimité';
  }
  return `${quota.used}/${quota.total}`;
}

/**
 * Obtenir le badge de statut d'une consultation
 */
function getConsultationStatusBadge(status) {
  const badges = {
    uploaded: { text: 'Uploadé', class: 'badge-info' },
    processing: { text: 'En cours', class: 'badge-warning' },
    completed: { text: 'Terminé', class: 'badge-success' },
    error: { text: 'Erreur', class: 'badge-error' }
  };
  
  return badges[status] || badges.uploaded;
}

/**
 * Obtenir le badge de priorité
 */
function getPriorityBadge(priority) {
  const badges = {
    high: { text: 'Haute', class: 'badge-error' },
    medium: { text: 'Moyenne', class: 'badge-warning' },
    low: { text: 'Basse', class: 'badge-info' }
  };
  
  return badges[priority] || badges.medium;
}

/**
 * Slugifier un texte (pour URLs, filenames)
 */
function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-');
}

/**
 * Tronquer un texte
 */
function truncate(text, maxLength = 100) {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + '...';
}

/**
 * Animation de compteur
 */
function animateCounter(element, start, end, duration = 1000) {
  const range = end - start;
  const increment = range / (duration / 16);
  let current = start;
  
  const timer = setInterval(() => {
    current += increment;
    if ((increment > 0 && current >= end) || (increment < 0 && current <= end)) {
      current = end;
      clearInterval(timer);
    }
    element.textContent = Math.round(current);
  }, 16);
}

/**
 * Gérer le localStorage avec fallback
 */
const storage = {
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.error('Erreur localStorage:', e);
      return false;
    }
  },
  
  get(key, defaultValue = null) {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (e) {
      console.error('Erreur localStorage:', e);
      return defaultValue;
    }
  },
  
  remove(key) {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (e) {
      console.error('Erreur localStorage:', e);
      return false;
    }
  },
  
  clear() {
    try {
      localStorage.clear();
      return true;
    } catch (e) {
      console.error('Erreur localStorage:', e);
      return false;
    }
  }
};