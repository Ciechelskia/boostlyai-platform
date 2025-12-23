/* ===================================
   KINESIA - Gestion Authentification
   Connexion, Inscription, Déconnexion
   =================================== */

/**
 * Connexion avec email et mot de passe
 */
async function signIn(email, password) {
  try {
    const client = getSupabaseClient();
    const { data, error } = await client.auth.signInWithPassword({
      email,
      password
    });
    
    if (error) throw error;
    
    console.log('✅ Connexion réussie:', data);
    return { success: true, data };
  } catch (error) {
    console.error('❌ Erreur connexion:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Inscription avec email et mot de passe
 */
async function signUp(email, password, fullName) {
  try {
    const client = getSupabaseClient();
    
    // 1. Créer le compte utilisateur
    const { data: authData, error: authError } = await client.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName
        }
      }
    });
    
    if (authError) throw authError;
    
    console.log('✅ Inscription réussie:', authData);
    
    // 2. Le profil sera créé automatiquement via un trigger Supabase
    // (si tu as configuré un trigger sur auth.users)
    
    return { success: true, data: authData };
  } catch (error) {
    console.error('❌ Erreur inscription:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Déconnexion
 */
async function signOut() {
  try {
    const client = getSupabaseClient();
    const { error } = await client.auth.signOut();
    
    if (error) throw error;
    
    console.log('✅ Déconnexion réussie');
    
    // Rediriger vers la page de connexion
    window.location.href = '/login.html';
    
    return { success: true };
  } catch (error) {
    console.error('❌ Erreur déconnexion:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Connexion avec Google OAuth
 */
async function signInWithGoogle() {
  try {
    const client = getSupabaseClient();
    const { data, error } = await client.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin + '/app.html'
      }
    });
    
    if (error) throw error;
    
    console.log('✅ Redirection vers Google OAuth');
    return { success: true, data };
  } catch (error) {
    console.error('❌ Erreur Google OAuth:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Réinitialisation du mot de passe
 */
async function resetPassword(email) {
  try {
    const client = getSupabaseClient();
    const { data, error } = await client.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/reset-password.html'
    });
    
    if (error) throw error;
    
    console.log('✅ Email de réinitialisation envoyé');
    return { success: true, data };
  } catch (error) {
    console.error('❌ Erreur réinitialisation:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Vérifier si l'utilisateur est authentifié et rediriger
 */
async function requireAuth() {
  const authenticated = await isAuthenticated();
  
  if (!authenticated) {
    console.log('⚠️ Non authentifié, redirection vers login');
    window.location.href = '/login.html';
    return false;
  }
  
  return true;
}

/**
 * Rediriger si déjà authentifié (pour la page login)
 */
async function redirectIfAuthenticated() {
  const authenticated = await isAuthenticated();
  
  if (authenticated) {
    console.log('✅ Déjà authentifié, redirection vers app');
    window.location.href = '/app.html';
    return true;
  }
  
  return false;
}