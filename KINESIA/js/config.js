/* ===================================
   KINESIA - Configuration
   Supabase & API
   =================================== */

const CONFIG = {
  // Supabase
  SUPABASE_URL: 'https://rxrgbvoqubejvejsppux.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ4cmdidm9xdWJlanZlanNwcHV4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4MzU0NzcsImV4cCI6MjA4MTQxMTQ3N30.rVYFfHh9py1IaZrovLIVQVxmhRImH29CqbmMJ-7rLSk',

  // N8N Webhooks
  N8N_WEBHOOK_TRANSCRIPTION: 'https://andreaprogra.app.n8n.cloud/webhook/process-meeting',
  N8N_WEBHOOK_DIAGNOSTIC: 'https://andreaprogra.app.n8n.cloud/webhook/process-knowledge-pdf',

  // Supabase Storage
  STORAGE_BUCKET_RECORDINGS: 'consultation-recordings',
  STORAGE_BUCKET_KNOWLEDGE: 'knowledge-base',
  MAX_FILE_SIZE_AUDIO: 50 * 1024 * 1024, // 50 MB
  MAX_FILE_SIZE_PDF: 20 * 1024 * 1024, // 20 MB

  // App
  APP_NAME: 'KINESIA',
  APP_VERSION: '1.0.0',

  // Quotas par plan - ✅ FREE PASSÉ EN ILLIMITÉ
  PLANS: {
    free: {
      name: 'Free',
      consultations_per_month: -1, // ✅ ILLIMITÉ
      max_duration_minutes: -1, // ✅ ILLIMITÉ
      price: 0
    },
    pro: {
      name: 'Pro',
      consultations_per_month: 100,
      max_duration_minutes: 180,
      price: 29.99
    },
    business: {
      name: 'Business',
      consultations_per_month: -1, // illimité
      max_duration_minutes: -1, // illimité
      price: 79.99
    }
  },

  // Types de consultations
  CONSULTATION_TYPES: [
    'Première consultation',
    'Suivi',
    'Bilan',
    'Urgence',
    'Rééducation',
    'Évaluation',
    'Autre'
  ],

  // Spécialités médicales
  SPECIALTIES: [
    'Kinésithérapie générale',
    'Kinésithérapie sportive',
    'Cardiologie',
    'Neurologie',
    'Pédiatrie',
    'Gériatrie',
    'Autre'
  ],

  // Status de consultations
  CONSULTATION_STATUS: {
    UPLOADED: 'uploaded',
    PROCESSING: 'processing',
    COMPLETED: 'completed',
    ERROR: 'error'
  }
};

// Export pour utilisation dans d'autres fichiers
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CONFIG;
}