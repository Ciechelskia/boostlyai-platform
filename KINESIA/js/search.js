/* ===================================
   KINESIA - Search Functions
   Recherche avancée dans les consultations
   =================================== */

/**
 * Recherche full-text dans les consultations
 */
async function searchConsultations(query, options = {}) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error('Utilisateur non authentifié');
    
    const client = getSupabaseClient();
    
    // Recherche dans les titres de consultations
    let consultationQuery = client
      .from('consultations')
      .select('*')
      .eq('user_id', user.id)
      .ilike('title', `%${query}%`);
    
    if (options.status) {
      consultationQuery = consultationQuery.eq('status', options.status);
    }
    
    if (options.type) {
      consultationQuery = consultationQuery.eq('consultation_type', options.type);
    }
    
    const { data: consultations, error: consultationError } = await consultationQuery;
    
    if (consultationError) throw consultationError;
    
    console.log(`✅ ${consultations.length} consultations trouvées`);
    
    return {
      success: true,
      results: consultations,
      count: consultations.length
    };
  } catch (error) {
    console.error('❌ Erreur recherche:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Recherche dans les transcriptions
 */
async function searchInTranscripts(query) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error('Utilisateur non authentifié');
    
    const client = getSupabaseClient();
    
    // Recherche dans les transcriptions
    const { data, error } = await client
      .from('transcripts')
      .select(`
        *,
        consultations!inner(*)
      `)
      .eq('consultations.user_id', user.id)
      .ilike('raw_text', `%${query}%`);
    
    if (error) throw error;
    
    console.log(`✅ ${data.length} transcriptions trouvées`);
    
    return {
      success: true,
      results: data,
      count: data.length
    };
  } catch (error) {
    console.error('❌ Erreur recherche transcriptions:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Recherche combinée (consultations + transcriptions)
 */
async function searchAll(query, options = {}) {
  try {
    // Recherche dans les consultations
    const consultationsResult = await searchConsultations(query, options);
    
    // Recherche dans les transcriptions
    const transcriptsResult = await searchInTranscripts(query);
    
    // Combiner les résultats
    const consultationIds = new Set();
    const results = [];
    
    // Ajouter les consultations trouvées
    if (consultationsResult.success) {
      consultationsResult.results.forEach(consultation => {
        consultationIds.add(consultation.id);
        results.push({
          type: 'consultation',
          consultation: consultation,
          matchIn: 'title'
        });
      });
    }
    
    // Ajouter les consultations trouvées via transcriptions
    if (transcriptsResult.success) {
      transcriptsResult.results.forEach(transcript => {
        if (!consultationIds.has(transcript.consultations.id)) {
          consultationIds.add(transcript.consultations.id);
          results.push({
            type: 'transcript',
            consultation: transcript.consultations,
            transcript: transcript,
            matchIn: 'transcript'
          });
        }
      });
    }
    
    console.log(`✅ ${results.length} résultats au total`);
    
    return {
      success: true,
      results: results,
      count: results.length
    };
  } catch (error) {
    console.error('❌ Erreur recherche globale:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Recherche par date
 */
async function searchByDateRange(startDate, endDate) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error('Utilisateur non authentifié');
    
    const client = getSupabaseClient();
    
    const { data, error } = await client
      .from('consultations')
      .select('*')
      .eq('user_id', user.id)
      .gte('created_at', startDate)
      .lte('created_at', endDate)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    console.log(`✅ ${data.length} consultations trouvées`);
    
    return {
      success: true,
      results: data,
      count: data.length
    };
  } catch (error) {
    console.error('❌ Erreur recherche par date:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Suggestions de recherche basées sur l'historique
 */
async function getSearchSuggestions(partialQuery) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error('Utilisateur non authentifié');
    
    const client = getSupabaseClient();
    
    // Récupérer les titres qui commencent par la requête
    const { data, error } = await client
      .from('consultations')
      .select('title')
      .eq('user_id', user.id)
      .ilike('title', `${partialQuery}%`)
      .limit(5);
    
    if (error) throw error;
    
    const suggestions = data.map(c => c.title);
    
    return {
      success: true,
      suggestions: suggestions
    };
  } catch (error) {
    console.error('❌ Erreur suggestions:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Recherche avancée avec filtres multiples
 */
async function advancedSearch(filters) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error('Utilisateur non authentifié');
    
    const client = getSupabaseClient();
    
    let query = client
      .from('consultations')
      .select('*')
      .eq('user_id', user.id);
    
    // Appliquer les filtres
    if (filters.query) {
      query = query.ilike('title', `%${filters.query}%`);
    }
    
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    
    if (filters.type) {
      query = query.eq('consultation_type', filters.type);
    }
    
    if (filters.patientName) {
      query = query.ilike('patient_name', `%${filters.patientName}%`);
    }
    
    if (filters.startDate) {
      query = query.gte('created_at', filters.startDate);
    }
    
    if (filters.endDate) {
      query = query.lte('created_at', filters.endDate);
    }
    
    if (filters.hasDiagnostic !== undefined) {
      query = query.eq('has_diagnostic', filters.hasDiagnostic);
    }
    
    if (filters.folderId) {
      query = query.eq('folder_id', filters.folderId);
    }
    
    // Tri
    const sortBy = filters.sortBy || 'created_at';
    const sortOrder = filters.sortOrder === 'asc' ? { ascending: true } : { ascending: false };
    query = query.order(sortBy, sortOrder);
    
    // Limite
    if (filters.limit) {
      query = query.limit(filters.limit);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    console.log(`✅ ${data.length} résultats trouvés`);
    
    return {
      success: true,
      results: data,
      count: data.length
    };
  } catch (error) {
    console.error('❌ Erreur recherche avancée:', error);
    return {
      success: false,
      error: error.message
    };
  }
}