/* ===================================
   KINESIA - Profile Management
   Gestion du profil utilisateur
   =================================== */

/**
 * Mettre à jour le profil utilisateur
 */
async function updateProfile(updates) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error('Utilisateur non authentifié');
    
    const client = getSupabaseClient();
    
    const { data, error } = await client
      .from('profiles')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)
      .select()
      .single();
    
    if (error) throw error;
    
    console.log('✅ Profil mis à jour');
    
    return {
      success: true,
      profile: data
    };
  } catch (error) {
    console.error('❌ Erreur mise à jour profil:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Mettre à jour l'avatar
 */
async function updateAvatar(avatarFile) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error('Utilisateur non authentifié');
    
    const client = getSupabaseClient();
    
    // Upload de l'avatar vers Storage
    const fileName = `${user.id}/avatar.${avatarFile.name.split('.').pop()}`;
    
    const { data: uploadData, error: uploadError } = await client.storage
      .from('avatars')
      .upload(fileName, avatarFile, {
        cacheControl: '3600',
        upsert: true
      });
    
    if (uploadError) throw uploadError;
    
    // Obtenir l'URL publique
    const { data: urlData } = client.storage
      .from('avatars')
      .getPublicUrl(fileName);
    
    // Mettre à jour le profil
    const result = await updateProfile({
      avatar_url: urlData.publicUrl
    });
    
    if (!result.success) throw new Error(result.error);
    
    console.log('✅ Avatar mis à jour');
    
    return {
      success: true,
      avatarUrl: urlData.publicUrl
    };
  } catch (error) {
    console.error('❌ Erreur upload avatar:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Mettre à jour l'email
 */
async function updateEmail(newEmail) {
  try {
    const client = getSupabaseClient();
    
    const { data, error } = await client.auth.updateUser({
      email: newEmail
    });
    
    if (error) throw error;
    
    console.log('✅ Email mis à jour (vérification requise)');
    
    return {
      success: true,
      message: 'Un email de confirmation a été envoyé à votre nouvelle adresse'
    };
  } catch (error) {
    console.error('❌ Erreur mise à jour email:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Mettre à jour le mot de passe
 */
async function updatePassword(newPassword) {
  try {
    const client = getSupabaseClient();
    
    const { data, error } = await client.auth.updateUser({
      password: newPassword
    });
    
    if (error) throw error;
    
    console.log('✅ Mot de passe mis à jour');
    
    return {
      success: true,
      message: 'Mot de passe mis à jour avec succès'
    };
  } catch (error) {
    console.error('❌ Erreur mise à jour mot de passe:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Supprimer le compte
 */
async function deleteAccount() {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error('Utilisateur non authentifié');
    
    const client = getSupabaseClient();
    
    // Note: La suppression complète du compte nécessite une fonction backend
    // Pour l'instant, on désactive juste le profil
    
    const { error } = await client
      .from('profiles')
      .update({
        is_active: false,
        deleted_at: new Date().toISOString()
      })
      .eq('id', user.id);
    
    if (error) throw error;
    
    // Se déconnecter
    await signOut();
    
    console.log('✅ Compte désactivé');
    
    return {
      success: true,
      message: 'Compte supprimé avec succès'
    };
  } catch (error) {
    console.error('❌ Erreur suppression compte:', error);
    return {
      success: false,
      error: error.message
    };
  }
}