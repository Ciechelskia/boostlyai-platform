/* ===================================
   KINESIA - Folders Management
   Gestion des dossiers patients
   =================================== */

/**
 * Créer un nouveau dossier
 */
async function createFolder(folderData) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error('Utilisateur non authentifié');
    
    const client = getSupabaseClient();
    
    const folder = {
      user_id: user.id,
      name: folderData.name,
      description: folderData.description || '',
      icon: folderData.icon || '📁',
      color: folderData.color || '#0EA5E9',
      created_at: new Date().toISOString()
    };
    
    const { data, error } = await client
      .from('folders')
      .insert([folder])
      .select()
      .single();
    
    if (error) throw error;
    
    console.log('✅ Dossier créé:', data.id);
    
    return {
      success: true,
      folder: data
    };
  } catch (error) {
    console.error('❌ Erreur création dossier:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Récupérer tous les dossiers de l'utilisateur
 */
async function getFolders() {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error('Utilisateur non authentifié');
    
    const client = getSupabaseClient();
    
    const { data, error } = await client
      .from('folders')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    console.log(`✅ ${data.length} dossiers récupérés`);
    
    return {
      success: true,
      folders: data
    };
  } catch (error) {
    console.error('❌ Erreur récupération dossiers:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Mettre à jour un dossier
 */
async function updateFolder(folderId, updates) {
  try {
    const client = getSupabaseClient();
    
    const { data, error } = await client
      .from('folders')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', folderId)
      .select()
      .single();
    
    if (error) throw error;
    
    console.log('✅ Dossier mis à jour:', folderId);
    
    return {
      success: true,
      folder: data
    };
  } catch (error) {
    console.error('❌ Erreur mise à jour dossier:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Supprimer un dossier
 */
async function deleteFolder(folderId) {
  try {
    const client = getSupabaseClient();
    
    const { error } = await client
      .from('folders')
      .delete()
      .eq('id', folderId);
    
    if (error) throw error;
    
    console.log('✅ Dossier supprimé:', folderId);
    
    return { success: true };
  } catch (error) {
    console.error('❌ Erreur suppression dossier:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Récupérer les consultations d'un dossier
 */
async function getFolderConsultations(folderId) {
  try {
    const client = getSupabaseClient();
    
    const { data, error } = await client
      .from('consultations')
      .select('*')
      .eq('folder_id', folderId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    console.log(`✅ ${data.length} consultations dans le dossier`);
    
    return {
      success: true,
      consultations: data
    };
  } catch (error) {
    console.error('❌ Erreur récupération consultations:', error);
    return {
      success: false,
      error: error.message
    };
  }
}