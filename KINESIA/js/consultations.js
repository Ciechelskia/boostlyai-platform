/* ===================================
   KINESIA - Consultations Management
   CRUD et logique métier consultations
   =================================== */

/**
 * Créer une nouvelle consultation
 */
async function createConsultation(consultationData) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error('Utilisateur non authentifié');
    
    const client = getSupabaseClient();
    
    const consultation = {
      user_id: user.id,
      title: consultationData.title,
      consultation_type: consultationData.type,
      patient_name: consultationData.patient_name || '',
      patient_id: consultationData.patient_id || '',
      objective: consultationData.objective || '',
      status: 'uploaded',
      created_at: new Date().toISOString()
    };
    
    const { data, error } = await client
      .from('consultations')
      .insert([consultation])
      .select()
      .single();
    
    if (error) throw error;
    
    console.log('✅ Consultation créée:', data.id);
    
    return {
      success: true,
      consultation: data
    };
  } catch (error) {
    console.error('❌ Erreur création consultation:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Récupérer toutes les consultations de l'utilisateur
 */
async function getConsultations(filters = {}) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error('Utilisateur non authentifié');
    
    const client = getSupabaseClient();
    
    let query = client
      .from('consultations')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    
    // Appliquer les filtres
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    
    if (filters.type) {
      query = query.eq('consultation_type', filters.type);
    }
    
    if (filters.folderId) {
      query = query.eq('folder_id', filters.folderId);
    }
    
    if (filters.search) {
      query = query.ilike('title', `%${filters.search}%`);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    console.log(`✅ ${data.length} consultations récupérées`);
    
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

/**
 * Récupérer une consultation par ID avec summaries et transcripts
 */
async function getConsultationById(consultationId) {
  try {
    const client = getSupabaseClient();
    
    // 1. Récupérer la consultation
    const { data: consultation, error: consultationError } = await client
      .from('consultations')
      .select('*')
      .eq('id', consultationId)
      .single();
    
    if (consultationError) throw consultationError;
    if (!consultation) throw new Error('Consultation non trouvée');
    
    console.log('✅ Consultation récupérée:', consultation);
    
    // 2. Récupérer les summaries
    const { data: summaries, error: summariesError } = await client
      .from('summaries')
      .select('*')
      .eq('consultation_id', consultationId);
    
    if (summariesError) {
      console.warn('⚠️ Erreur summaries:', summariesError);
    } else {
      console.log('✅ Summaries récupérés:', summaries);
    }
    
    // 3. Récupérer les transcripts
    const { data: transcripts, error: transcriptsError } = await client
      .from('transcripts')
      .select('*')
      .eq('consultation_id', consultationId);
    
    if (transcriptsError) {
      console.warn('⚠️ Erreur transcripts:', transcriptsError);
    } else {
      console.log('✅ Transcripts récupérés:', transcripts);
    }
    
    // 4. Combiner les données
    consultation.summaries = summaries || [];
    consultation.transcripts = transcripts || [];
    
    console.log('✅ Consultation finale avec relations:', consultation);
    
    return {
      success: true,
      consultation: consultation
    };
  } catch (error) {
    console.error('❌ Erreur récupération consultation:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Mettre à jour une consultation
 */
async function updateConsultation(consultationId, updates) {
  try {
    const client = getSupabaseClient();
    
    const { data, error } = await client
      .from('consultations')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', consultationId)
      .select()
      .single();
    
    if (error) throw error;
    
    console.log('✅ Consultation mise à jour:', consultationId);
    
    return {
      success: true,
      consultation: data
    };
  } catch (error) {
    console.error('❌ Erreur mise à jour consultation:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Supprimer une consultation
 */
async function deleteConsultation(consultationId) {
  try {
    const client = getSupabaseClient();
    
    // 1. Récupérer la consultation pour obtenir l'URL audio
    const { data: consultation } = await client
      .from('consultations')
      .select('audio_url')
      .eq('id', consultationId)
      .single();
    
    // 2. Supprimer le fichier audio si existe
    if (consultation && consultation.audio_url) {
      // Extraire le chemin du fichier depuis l'URL
      const pathMatch = consultation.audio_url.match(/consultation-recordings\/(.+)\?/);
      if (pathMatch) {
        await deleteAudioFile(pathMatch[1]);
      }
    }
    
    // 3. Supprimer la consultation (cascade delete pour transcripts et summaries)
    const { error } = await client
      .from('consultations')
      .delete()
      .eq('id', consultationId);
    
    if (error) throw error;
    
    console.log('✅ Consultation supprimée:', consultationId);
    
    return { success: true };
  } catch (error) {
    console.error('❌ Erreur suppression consultation:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Créer un lien de partage pour une consultation
 */
async function createShareLink(consultationId, expiresInDays = 7) {
  try {
    const client = getSupabaseClient();
    
    const token = generateUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);
    
    const { data, error } = await client
      .from('shares')
      .insert([{
        consultation_id: consultationId,
        token: token,
        expires_at: expiresAt.toISOString(),
        views_count: 0
      }])
      .select()
      .single();
    
    if (error) throw error;
    
    const shareUrl = `${window.location.origin}/share.html?token=${token}`;
    
    console.log('✅ Lien de partage créé:', shareUrl);
    
    return {
      success: true,
      shareUrl,
      expiresAt: expiresAt
    };
  } catch (error) {
    console.error('❌ Erreur création lien:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Récupérer les statistiques utilisateur
 */
async function getUserStats() {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error('Utilisateur non authentifié');
    
    const client = getSupabaseClient();
    
    // Nombre total de consultations
    const { count: totalConsultations } = await client
      .from('consultations')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);
    
    // Nombre de consultations ce mois
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    
    const { count: monthConsultations } = await client
      .from('consultations')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', startOfMonth.toISOString());
    
    // Durée totale
    const { data: consultations } = await client
      .from('consultations')
      .select('duration_seconds')
      .eq('user_id', user.id);
    
    const totalDuration = consultations?.reduce((sum, c) => sum + (c.duration_seconds || 0), 0) || 0;
    
    // Profil utilisateur pour les quotas
    const profile = await getUserProfile(user.id);
    
    return {
      success: true,
      stats: {
        totalConsultations: totalConsultations || 0,
        monthConsultations: monthConsultations || 0,
        totalDuration,
        quota: checkQuota(profile)
      }
    };
  } catch (error) {
    console.error('❌ Erreur statistiques:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Rechercher dans les transcriptions
 */
async function searchTranscripts(searchQuery) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error('Utilisateur non authentifié');
    
    const client = getSupabaseClient();
    
    // Recherche full-text dans les transcriptions
    const { data, error } = await client
      .from('transcripts')
      .select(`
        *,
        consultations!inner(*)
      `)
      .eq('consultations.user_id', user.id)
      .textSearch('raw_text', searchQuery);
    
    if (error) throw error;
    
    console.log(`✅ ${data.length} résultats trouvés`);
    
    return {
      success: true,
      results: data
    };
  } catch (error) {
    console.error('❌ Erreur recherche:', error);
    return {
      success: false,
      error: error.message
    };
  }
}