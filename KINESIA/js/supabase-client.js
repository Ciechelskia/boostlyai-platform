/* ===================================
   KINESIA - Supabase Client
   Client Supabase initialisé
   =================================== */

// Import du SDK Supabase (chargé via CDN dans le HTML)
// const { createClient } = supabase;

let supabaseClient = null;

/**
 * Initialiser le client Supabase
 */
function initSupabase() {
  if (!supabaseClient) {
    // Utiliser window.supabase qui contient le SDK
    const supabaseSDK = window.supabase;
    
    supabaseClient = supabaseSDK.createClient(
      CONFIG.SUPABASE_URL,
      CONFIG.SUPABASE_ANON_KEY
    );
    console.log('✅ Supabase client initialisé');
    
    // ⭐ CRÉER L'ALIAS GLOBAL APRÈS INITIALISATION ⭐
    // Cet alias permet aux nouvelles pages d'utiliser "supabase" directement
    window.supabase = supabaseClient;
    console.log('✅ Global supabase alias created');
  }
  return supabaseClient;
}

/**
 * Obtenir le client Supabase
 */
function getSupabaseClient() {
  if (!supabaseClient) {
    return initSupabase();
  }
  return supabaseClient;
}

/**
 * Vérifier si l'utilisateur est connecté
 */
async function isAuthenticated() {
  try {
    const client = getSupabaseClient();
    const { data: { session } } = await client.auth.getSession();
    return session !== null;
  } catch (error) {
    console.error('❌ Erreur vérification auth:', error);
    return false;
  }
}

/**
 * Obtenir l'utilisateur actuel
 */
async function getCurrentUser() {
  try {
    const client = getSupabaseClient();
    const { data: { user }, error } = await client.auth.getUser();
    if (error) throw error;
    return user;
  } catch (error) {
    console.error('❌ Erreur récupération utilisateur:', error);
    return null;
  }
}

/**
 * Obtenir le profil complet de l'utilisateur
 */
async function getUserProfile(userId) {
  try {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('❌ Erreur récupération profil:', error);
    return null;
  }
}

/**
 * Écouter les changements d'authentification
 */
function onAuthStateChange(callback) {
  const client = getSupabaseClient();
  return client.auth.onAuthStateChange((event, session) => {
    console.log('🔄 Auth state changed:', event);
    callback(event, session);
  });
}

// Initialiser automatiquement au chargement
if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    initSupabase();
  });
}