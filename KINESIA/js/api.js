/* ===================================
   KINESIA - API Module
   Appels vers N8N webhook + Insertion Supabase
   =================================== */

/**
 * Envoyer les données de consultation au webhook N8N pour analyse
 * ET récupérer les résultats pour les insérer dans Supabase
 */
async function processWithN8N(consultationData) {
  try {
    console.log('📡 Envoi vers N8N:', consultationData.consultation_id);
    
    const response = await fetch(CONFIG.N8N_WEBHOOK_TRANSCRIPTION, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(consultationData)
    });
    
    if (!response.ok) {
      throw new Error(`Erreur HTTP: ${response.status}`);
    }
    
    const result = await response.json();
    
    console.log('✅ Réponse N8N reçue:', result);
    
    // Vérifier que N8N a renvoyé les bonnes données
    if (!result.success || !result.summary) {
      throw new Error('Réponse N8N invalide');
    }
    
    return {
      success: true,
      data: result
    };
  } catch (error) {
    console.error('❌ Erreur N8N:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Insérer la transcription dans Supabase
 */
async function insertTranscript(consultationId, transcriptText) {
  try {
    const client = getSupabaseClient();
    
    // Créer un objet content avec la structure attendue
    const content = {
      text: transcriptText,
      language: 'fr',
      timestamp: new Date().toISOString()
    };
    
    const { data, error } = await client
      .from('transcripts')
      .insert({
        consultation_id: consultationId,
        content: content,
        raw_text: transcriptText,
        language: 'fr'
      })
      .select()
      .single();
    
    if (error) throw error;
    
    console.log('✅ Transcription insérée:', data.id);
    return { success: true, data };
    
  } catch (error) {
    console.error('❌ Erreur insertion transcription:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Insérer le résumé dans Supabase
 */
async function insertSummary(consultationId, summary) {
  try {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('summaries')
      .insert({
        consultation_id: consultationId,
        executive_summary: summary.executive_summary,
        key_points: summary.key_points,
        decisions_made: summary.decisions_made,
        action_items: summary.action_items,
        next_steps: summary.next_steps,
        sentiment_analysis: summary.sentiment_analysis,
        friction_points: summary.friction_points,
        opportunities: summary.opportunities,
        keywords: summary.keywords
      })
      .select()
      .single();
    
    if (error) throw error;
    
    console.log('✅ Résumé inséré:', data.id);
    return { success: true, data };
    
  } catch (error) {
    console.error('❌ Erreur insertion résumé:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Workflow complet : Upload → N8N → Sauvegarde Supabase
 */
async function processConsultationComplete(consultationId, audioFile, consultationInfo, onProgress) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error('Utilisateur non authentifié');
    
    // Étape 1: Upload du fichier audio (25%)
    if (onProgress) onProgress({ percentage: 10, message: 'Upload du fichier audio...' });
    const uploadResult = await uploadAudioFile(audioFile, consultationId, user.id);
    
    if (!uploadResult.success) {
      throw new Error(uploadResult.error);
    }
    
    if (onProgress) onProgress({ percentage: 25, message: 'Fichier uploadé avec succès' });
    
    // Étape 2: Mise à jour de la consultation avec l'URL audio
    if (onProgress) onProgress({ percentage: 30, message: 'Enregistrement des informations...' });
    await updateConsultation(consultationId, {
      audio_url: uploadResult.url,
      audio_filename: audioFile.name,
      audio_size_bytes: audioFile.size,
      status: 'processing'
    });
    
    // Étape 3: Envoi à N8N pour transcription + analyse
    if (onProgress) onProgress({ percentage: 40, message: 'Transcription et analyse IA en cours...' });
    
    const n8nData = {
      consultation_id: consultationId,
      audio_url: uploadResult.url
    };
    
    const n8nResult = await processWithN8N(n8nData);
    
    if (!n8nResult.success) {
      console.warn('⚠️ N8N a échoué');
      await updateConsultation(consultationId, {
        status: 'error',
        error_message: n8nResult.error
      });
      throw new Error(n8nResult.error);
    }
    
    if (onProgress) onProgress({ percentage: 70, message: 'Sauvegarde de la transcription...' });
    
    // Étape 4: Sauvegarder la transcription
    const transcriptResult = await insertTranscript(
      consultationId, 
      n8nResult.data.transcript_text
    );
    
    if (!transcriptResult.success) {
      throw new Error('Erreur sauvegarde transcription: ' + transcriptResult.error);
    }
    
    if (onProgress) onProgress({ percentage: 85, message: 'Sauvegarde du résumé...' });
    
    // Étape 5: Sauvegarder le résumé
    const summaryResult = await insertSummary(
      consultationId,
      n8nResult.data.summary
    );
    
    if (!summaryResult.success) {
      throw new Error('Erreur sauvegarde résumé: ' + summaryResult.error);
    }
    
    if (onProgress) onProgress({ percentage: 95, message: 'Finalisation...' });
    
    // Étape 6: Mettre à jour le statut final
    await updateConsultation(consultationId, {
      status: 'completed',
      has_transcript: true,
      has_summary: true,
      processed_at: new Date().toISOString()
    });
    
    if (onProgress) onProgress({ percentage: 100, message: 'Traitement terminé !' });
    
    console.log('✅ Traitement complet terminé');
    
    return {
      success: true,
      consultation_id: consultationId
    };
    
  } catch (error) {
    console.error('❌ Erreur traitement complet:', error);
    
    // Mettre à jour le statut en erreur
    try {
      await updateConsultation(consultationId, {
        status: 'error',
        error_message: error.message
      });
    } catch (e) {
      console.error('Erreur mise à jour statut:', e);
    }
    
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Retry logic pour les appels API
 */
async function fetchWithRetry(url, options, maxRetries = 3) {
  let lastError;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, options);
      if (response.ok) {
        return response;
      }
      lastError = new Error(`HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
      console.warn(`Tentative ${i + 1}/${maxRetries} échouée:`, error);
      
      // Attendre avant de réessayer (backoff exponentiel)
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
      }
    }
  }
  
  throw lastError;
}