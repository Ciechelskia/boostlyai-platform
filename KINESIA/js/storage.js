/* ===================================
   KINESIA - Storage Management
   Upload de fichiers vers Supabase
   =================================== */

/**
 * Upload un fichier audio vers Supabase Storage
 */
async function uploadAudioFile(file, consultationId, userId) {
  try {
    // Validation de la taille
    if (file.size > CONFIG.MAX_FILE_SIZE_AUDIO) {
      throw new Error(`Fichier trop volumineux. Maximum ${formatFileSize(CONFIG.MAX_FILE_SIZE_AUDIO)}`);
    }
    
    // Validation du type
    const allowedTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/m4a', 'audio/ogg', 'audio/webm'];
    if (!allowedTypes.includes(file.type) && !file.name.match(/\.(mp3|wav|m4a|ogg|webm)$/i)) {
      throw new Error('Format de fichier non supporté. Utilisez MP3, WAV, M4A, OGG ou WebM.');
    }
    
    const client = getSupabaseClient();
    const fileName = `${userId}/${consultationId}.${file.name.split('.').pop()}`;
    
    console.log('📤 Upload fichier:', fileName);
    
    // Upload vers Supabase Storage
    const { data, error } = await client.storage
      .from(CONFIG.STORAGE_BUCKET_RECORDINGS)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: true
      });
    
    if (error) throw error;
    
    console.log('✅ Fichier uploadé, path:', data.path);
    
    // Obtenir l'URL publique (signée pour 1 an)
    const { data: signedUrlData, error: urlError } = await client.storage
      .from(CONFIG.STORAGE_BUCKET_RECORDINGS)
      .createSignedUrl(fileName, 31536000); // 1 an en secondes
    
    if (urlError) {
      console.warn('⚠️ Erreur création URL signée:', urlError);
      // Fallback: utiliser getPublicUrl
      const { data: publicUrlData } = client.storage
        .from(CONFIG.STORAGE_BUCKET_RECORDINGS)
        .getPublicUrl(fileName);
      
      console.log('✅ URL publique générée:', publicUrlData.publicUrl);
      
      return {
        success: true,
        path: data.path,
        url: publicUrlData.publicUrl
      };
    }
    
    console.log('✅ URL signée générée:', signedUrlData.signedUrl);
    
    return {
      success: true,
      path: data.path,
      url: signedUrlData.signedUrl
    };
  } catch (error) {
    console.error('❌ Erreur upload:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Supprimer un fichier audio de Supabase Storage
 */
async function deleteAudioFile(audioPath) {
  try {
    const client = getSupabaseClient();
    
    const { error } = await client.storage
      .from(CONFIG.STORAGE_BUCKET_RECORDINGS)
      .remove([audioPath]);
    
    if (error) throw error;
    
    console.log('✅ Fichier supprimé:', audioPath);
    return { success: true };
  } catch (error) {
    console.error('❌ Erreur suppression:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Obtenir l'URL d'un fichier audio
 */
async function getAudioUrl(audioPath) {
  try {
    const client = getSupabaseClient();
    
    const { data, error } = client.storage
      .from(CONFIG.STORAGE_BUCKET_RECORDINGS)
      .createSignedUrl(audioPath, 3600); // 1 heure
    
    if (error) throw error;
    
    return {
      success: true,
      url: data.signedUrl
    };
  } catch (error) {
    console.error('❌ Erreur récupération URL:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Upload un PDF vers la base de connaissances
 */
async function uploadKnowledgePDF(file, userId, metadata = {}) {
  try {
    // Validation de la taille
    if (file.size > CONFIG.MAX_FILE_SIZE_PDF) {
      throw new Error(`Fichier trop volumineux. Maximum ${formatFileSize(CONFIG.MAX_FILE_SIZE_PDF)}`);
    }
    
    // Validation du type
    if (file.type !== 'application/pdf' && !file.name.endsWith('.pdf')) {
      throw new Error('Seuls les fichiers PDF sont acceptés.');
    }
    
    const client = getSupabaseClient();
    const timestamp = Date.now();
    const fileName = `${userId}/courses/${timestamp}-${file.name}`;
    
    console.log('📤 Upload PDF:', fileName);
    
    // Upload vers Supabase Storage
    const { data, error } = await client.storage
      .from(CONFIG.STORAGE_BUCKET_KNOWLEDGE)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });
    
    if (error) throw error;
    
    console.log('✅ PDF uploadé, path:', data.path);
    
    // Obtenir l'URL privée
    const { data: urlData } = client.storage
      .from(CONFIG.STORAGE_BUCKET_KNOWLEDGE)
      .getPublicUrl(fileName);
    
    return {
      success: true,
      path: data.path,
      url: urlData.publicUrl,
      fileName: file.name,
      fileSize: file.size
    };
  } catch (error) {
    console.error('❌ Erreur upload PDF:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Supprimer un PDF de la base de connaissances
 */
async function deleteKnowledgePDF(pdfPath) {
  try {
    const client = getSupabaseClient();
    
    const { error } = await client.storage
      .from(CONFIG.STORAGE_BUCKET_KNOWLEDGE)
      .remove([pdfPath]);
    
    if (error) throw error;
    
    console.log('✅ PDF supprimé:', pdfPath);
    return { success: true };
  } catch (error) {
    console.error('❌ Erreur suppression PDF:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Upload avec progress bar
 */
async function uploadWithProgress(file, consultationId, userId, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    
    // Progress tracking
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        const percentComplete = (e.loaded / e.total) * 100;
        if (onProgress) onProgress(percentComplete);
      }
    });
    
    // Completion
    xhr.addEventListener('load', async () => {
      if (xhr.status === 200) {
        const result = await uploadAudioFile(file, consultationId, userId);
        resolve(result);
      } else {
        reject(new Error('Erreur lors de l\'upload'));
      }
    });
    
    // Error
    xhr.addEventListener('error', () => {
      reject(new Error('Erreur réseau lors de l\'upload'));
    });
    
    // Pour simplifier, on utilise la fonction normale
    // Dans une vraie implémentation, il faudrait utiliser le SDK Supabase avec tracking
    uploadAudioFile(file, consultationId, userId)
      .then(resolve)
      .catch(reject);
  });
}