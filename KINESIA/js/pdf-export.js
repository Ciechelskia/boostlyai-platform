/* ===================================
   KINESIA - PDF Export System
   Export professionnel Diagnostic & Programme
   =================================== */

/**
 * Exporter le diagnostic en PDF
 */
async function exportDiagnosticPDF(consultationId) {
  try {
    showToast('Génération du PDF en cours...', 'info');
    
    // Récupérer les données depuis Supabase
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('diagnostic_reports')
      .select('*')
      .eq('consultation_id', consultationId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    if (error) throw error;
    if (!data) throw new Error('Aucun diagnostic trouvé');
    
    // Récupérer aussi les infos de consultation
    const consultation = currentConsultation || await getConsultationById(consultationId);
    
    // Créer le PDF
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    let yPos = 20;
    const pageWidth = doc.internal.pageSize.width;
    const margin = 20;
    const contentWidth = pageWidth - (margin * 2);
    
    // ===== EN-TÊTE =====
    doc.setFillColor(14, 165, 233); // Bleu KINESIA
    doc.rect(0, 0, pageWidth, 40, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont(undefined, 'bold');
    doc.text('KINESIA', margin, 20);
    
    doc.setFontSize(12);
    doc.setFont(undefined, 'normal');
    doc.text('Diagnostic Kinésithérapie', margin, 30);
    
    // Date
    doc.setFontSize(10);
    doc.text(formatDate(new Date().toISOString()), pageWidth - margin, 30, { align: 'right' });
    
    yPos = 55;
    doc.setTextColor(0, 0, 0);
    
    // ===== AVERTISSEMENT =====
    doc.setFillColor(254, 243, 199); // Jaune clair
    doc.rect(margin, yPos, contentWidth, 25, 'F');
    
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(146, 64, 14);
    doc.text('⚠️ IMPORTANT - Diagnostic IA', margin + 5, yPos + 8);
    
    doc.setFont(undefined, 'normal');
    doc.setFontSize(8);
    const warningText = "Ce diagnostic est généré automatiquement par intelligence artificielle et doit être validé par un praticien diplômé. Il ne remplace en aucun cas l'examen clinique et le jugement professionnel du kinésithérapeute.";
    const warningLines = doc.splitTextToSize(warningText, contentWidth - 10);
    doc.text(warningLines, margin + 5, yPos + 14);
    
    yPos += 35;
    doc.setTextColor(0, 0, 0);
    
    // ===== INFORMATIONS PATIENT =====
    if (consultation.patient_name) {
      doc.setFontSize(11);
      doc.setFont(undefined, 'bold');
      doc.text('Patient :', margin, yPos);
      doc.setFont(undefined, 'normal');
      doc.text(consultation.patient_name, margin + 25, yPos);
      yPos += 7;
    }
    
    doc.setFont(undefined, 'bold');
    doc.text('Date :', margin, yPos);
    doc.setFont(undefined, 'normal');
    doc.text(formatDate(consultation.created_at), margin + 25, yPos);
    yPos += 15;
    
    // ===== PARSE DIAGNOSTIC DATA =====
    let diagnosticData;
    try {
      diagnosticData = typeof data.diagnostic_data === 'string' 
        ? JSON.parse(data.diagnostic_data) 
        : data.diagnostic_data;
    } catch (e) {
      console.error('Erreur parsing diagnostic_data:', e);
      diagnosticData = null;
    }
    
    // ===== TITRE DU DIAGNOSTIC =====
    if (diagnosticData?.titre) {
      doc.setFontSize(16);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(14, 165, 233);
      doc.text(diagnosticData.titre, margin, yPos);
      yPos += 12;
      doc.setTextColor(0, 0, 0);
    }
    
    // ===== PATHOLOGIE =====
    if (diagnosticData?.pathologie) {
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text('Pathologie', margin, yPos);
      yPos += 7;
      
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      doc.text(diagnosticData.pathologie, margin, yPos);
      yPos += 10;
    }
    
    // ===== SYMPTÔMES OBSERVÉS =====
    if (diagnosticData?.symptomes_observes && diagnosticData.symptomes_observes.length > 0) {
      checkPageBreak(doc, yPos, 40);
      
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text('Symptômes observés', margin, yPos);
      yPos += 7;
      
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      diagnosticData.symptomes_observes.forEach(symptome => {
        checkPageBreak(doc, yPos, 10);
        doc.text('• ' + symptome, margin + 5, yPos);
        yPos += 6;
      });
      yPos += 5;
    }
    
    // ===== ANALYSE CLINIQUE =====
    if (diagnosticData?.analyse_clinique) {
      checkPageBreak(doc, yPos, 40);
      
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text('Analyse clinique', margin, yPos);
      yPos += 7;
      
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      const analyseLines = doc.splitTextToSize(diagnosticData.analyse_clinique, contentWidth);
      analyseLines.forEach(line => {
        checkPageBreak(doc, yPos, 10);
        doc.text(line, margin, yPos);
        yPos += 6;
      });
      yPos += 5;
    }
    
    // ===== MÉCANISME LÉSIONNEL =====
    if (diagnosticData?.mecanisme_lesion) {
      checkPageBreak(doc, yPos, 40);
      
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text('Mécanisme lésionnel', margin, yPos);
      yPos += 7;
      
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      const mecanismeLines = doc.splitTextToSize(diagnosticData.mecanisme_lesion, contentWidth);
      mecanismeLines.forEach(line => {
        checkPageBreak(doc, yPos, 10);
        doc.text(line, margin, yPos);
        yPos += 6;
      });
      yPos += 5;
    }
    
    // ===== PRONOSTIC =====
    if (diagnosticData?.pronostic) {
      checkPageBreak(doc, yPos, 40);
      
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text('Pronostic', margin, yPos);
      yPos += 7;
      
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      const pronosticLines = doc.splitTextToSize(diagnosticData.pronostic, contentWidth);
      pronosticLines.forEach(line => {
        checkPageBreak(doc, yPos, 10);
        doc.text(line, margin, yPos);
        yPos += 6;
      });
      yPos += 5;
    }
    
    // ===== RECOMMANDATIONS =====
    if (diagnosticData?.recommandations && diagnosticData.recommandations.length > 0) {
      checkPageBreak(doc, yPos, 40);
      
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text('Recommandations', margin, yPos);
      yPos += 7;
      
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      diagnosticData.recommandations.forEach(reco => {
        checkPageBreak(doc, yPos, 10);
        doc.text('• ' + reco, margin + 5, yPos);
        yPos += 6;
      });
      yPos += 5;
    }
    
    // ===== SOURCES MÉDICALES =====
    if (diagnosticData?.sources_medicales && diagnosticData.sources_medicales.length > 0) {
      checkPageBreak(doc, yPos, 40);
      
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text('Sources médicales', margin, yPos);
      yPos += 7;
      
      doc.setFontSize(8);
      doc.setFont(undefined, 'normal');
      doc.setTextColor(100, 100, 100);
      diagnosticData.sources_medicales.forEach(source => {
        checkPageBreak(doc, yPos, 10);
        doc.text('• ' + source, margin + 5, yPos);
        yPos += 5;
      });
    }
    
    // ===== PIED DE PAGE =====
    addFooter(doc);
    
    // ===== SAUVEGARDER =====
    const filename = `KINESIA_Diagnostic_${consultation.patient_name || 'Patient'}_${formatDate(new Date().toISOString(), { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '-')}.pdf`;
    doc.save(filename);
    
    showToast('✅ PDF généré avec succès !', 'success');
    
  } catch (error) {
    console.error('❌ Erreur export PDF diagnostic:', error);
    showToast('Erreur lors de la génération du PDF', 'error');
  }
}

/**
 * Exporter le programme en PDF
 */
async function exportProgrammePDF(consultationId) {
  try {
    showToast('Génération du PDF en cours...', 'info');
    
    // Récupérer les données depuis Supabase
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('diagnostic_reports')
      .select('*')
      .eq('consultation_id', consultationId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    if (error) throw error;
    if (!data) throw new Error('Aucun programme trouvé');
    
    // Récupérer aussi les infos de consultation
    const consultation = currentConsultation || await getConsultationById(consultationId);
    
    // Créer le PDF
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    let yPos = 20;
    const pageWidth = doc.internal.pageSize.width;
    const margin = 20;
    const contentWidth = pageWidth - (margin * 2);
    
    // ===== EN-TÊTE =====
    doc.setFillColor(14, 165, 233);
    doc.rect(0, 0, pageWidth, 40, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont(undefined, 'bold');
    doc.text('KINESIA', margin, 20);
    
    doc.setFontSize(12);
    doc.setFont(undefined, 'normal');
    doc.text('Programme de Rééducation', margin, 30);
    
    doc.setFontSize(10);
    doc.text(formatDate(new Date().toISOString()), pageWidth - margin, 30, { align: 'right' });
    
    yPos = 55;
    doc.setTextColor(0, 0, 0);
    
    // ===== INFORMATIONS PATIENT =====
    if (consultation.patient_name) {
      doc.setFontSize(11);
      doc.setFont(undefined, 'bold');
      doc.text('Patient :', margin, yPos);
      doc.setFont(undefined, 'normal');
      doc.text(consultation.patient_name, margin + 25, yPos);
      yPos += 7;
    }
    
    doc.setFont(undefined, 'bold');
    doc.text('Date :', margin, yPos);
    doc.setFont(undefined, 'normal');
    doc.text(formatDate(consultation.created_at), margin + 25, yPos);
    yPos += 15;
    
    // ===== PARSE PROGRAMME DATA =====
    let programmeData;
    try {
      programmeData = typeof data.programme_data === 'string' 
        ? JSON.parse(data.programme_data) 
        : data.programme_data;
    } catch (e) {
      console.error('Erreur parsing programme_data:', e);
      programmeData = null;
    }
    
    // ===== TITRE DU PROGRAMME =====
    if (programmeData?.titre) {
      doc.setFontSize(16);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(14, 165, 233);
      doc.text(programmeData.titre, margin, yPos);
      yPos += 12;
      doc.setTextColor(0, 0, 0);
    }
    
    // ===== DURÉE TOTALE =====
    if (programmeData?.duree_totale) {
      doc.setFontSize(11);
      doc.setFont(undefined, 'bold');
      doc.text('Durée totale : ', margin, yPos);
      doc.setFont(undefined, 'normal');
      doc.text(programmeData.duree_totale, margin + 30, yPos);
      yPos += 10;
    }
    
    // ===== OBJECTIFS PRINCIPAUX =====
    if (programmeData?.objectifs_principaux && programmeData.objectifs_principaux.length > 0) {
      checkPageBreak(doc, yPos, 40);
      
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text('Objectifs principaux', margin, yPos);
      yPos += 7;
      
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      programmeData.objectifs_principaux.forEach(obj => {
        checkPageBreak(doc, yPos, 10);
        doc.text('• ' + obj, margin + 5, yPos);
        yPos += 6;
      });
      yPos += 8;
    }
    
    // ===== PHASES DE RÉÉDUCATION =====
    if (programmeData?.phases && programmeData.phases.length > 0) {
      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(14, 165, 233);
      doc.text('Phases de Rééducation', margin, yPos);
      yPos += 10;
      doc.setTextColor(0, 0, 0);
      
      programmeData.phases.forEach((phase, index) => {
        checkPageBreak(doc, yPos, 60);
        
        // Titre de la phase
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text(`Phase ${phase.numero} - ${phase.periode}`, margin, yPos);
        yPos += 7;
        
        // Objectif de la phase
        if (phase.objectif_phase) {
          doc.setFontSize(10);
          doc.setFont(undefined, 'bold');
          doc.text('Objectif : ', margin + 5, yPos);
          doc.setFont(undefined, 'normal');
          const objLines = doc.splitTextToSize(phase.objectif_phase, contentWidth - 25);
          doc.text(objLines, margin + 25, yPos);
          yPos += (objLines.length * 6) + 5;
        }
        
        // Exercices
        if (phase.exercices && phase.exercices.length > 0) {
          doc.setFontSize(11);
          doc.setFont(undefined, 'bold');
          doc.text('Exercices :', margin + 5, yPos);
          yPos += 7;
          
          phase.exercices.forEach((ex, exIndex) => {
            checkPageBreak(doc, yPos, 35);
            
            doc.setFontSize(10);
            doc.setFont(undefined, 'bold');
            doc.text(`${exIndex + 1}. ${ex.nom}`, margin + 10, yPos);
            yPos += 6;
            
            doc.setFont(undefined, 'normal');
            const descLines = doc.splitTextToSize(ex.description, contentWidth - 20);
            doc.text(descLines, margin + 10, yPos);
            yPos += (descLines.length * 5) + 3;
            
            doc.setFontSize(9);
            doc.text(`Répétitions : ${ex.repetitions}`, margin + 10, yPos);
            yPos += 5;
            doc.text(`Fréquence : ${ex.frequence}`, margin + 10, yPos);
            yPos += 5;
            doc.text(`Précautions : ${ex.precautions}`, margin + 10, yPos);
            yPos += 8;
          });
        }
        
        // Conseils
        if (phase.conseils && phase.conseils.length > 0) {
          checkPageBreak(doc, yPos, 30);
          
          doc.setFontSize(11);
          doc.setFont(undefined, 'bold');
          doc.text('Conseils :', margin + 5, yPos);
          yPos += 7;
          
          doc.setFontSize(9);
          doc.setFont(undefined, 'normal');
          phase.conseils.forEach(conseil => {
            checkPageBreak(doc, yPos, 10);
            doc.text('• ' + conseil, margin + 10, yPos);
            yPos += 5;
          });
          yPos += 5;
        }
        
        yPos += 5;
      });
    }
    
    // ===== CRITÈRES DE PROGRESSION =====
    if (programmeData?.criteres_progression && programmeData.criteres_progression.length > 0) {
      checkPageBreak(doc, yPos, 40);
      
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text('Critères de progression', margin, yPos);
      yPos += 7;
      
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      programmeData.criteres_progression.forEach(critere => {
        checkPageBreak(doc, yPos, 10);
        doc.text('• ' + critere, margin + 5, yPos);
        yPos += 6;
      });
      yPos += 8;
    }
    
    // ===== SIGNES D'ALERTE =====
    if (programmeData?.signes_alerte && programmeData.signes_alerte.length > 0) {
      checkPageBreak(doc, yPos, 40);
      
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(239, 68, 68);
      doc.text('⚠️ Signes d\'alerte', margin, yPos);
      yPos += 7;
      
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      doc.setTextColor(0, 0, 0);
      programmeData.signes_alerte.forEach(signe => {
        checkPageBreak(doc, yPos, 10);
        doc.text('• ' + signe, margin + 5, yPos);
        yPos += 6;
      });
      yPos += 8;
    }
    
    // ===== SOURCES =====
    if (programmeData?.sources_exercices && programmeData.sources_exercices.length > 0) {
      checkPageBreak(doc, yPos, 30);
      
      doc.setFontSize(10);
      doc.setFont(undefined, 'bold');
      doc.text('Sources :', margin, yPos);
      yPos += 7;
      
      doc.setFontSize(8);
      doc.setFont(undefined, 'normal');
      doc.setTextColor(100, 100, 100);
      programmeData.sources_exercices.forEach(source => {
        checkPageBreak(doc, yPos, 8);
        doc.text('• ' + source, margin + 5, yPos);
        yPos += 5;
      });
    }
    
    // ===== PIED DE PAGE =====
    addFooter(doc);
    
    // ===== SAUVEGARDER =====
    const filename = `KINESIA_Programme_${consultation.patient_name || 'Patient'}_${formatDate(new Date().toISOString(), { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '-')}.pdf`;
    doc.save(filename);
    
    showToast('✅ PDF généré avec succès !', 'success');
    
  } catch (error) {
    console.error('❌ Erreur export PDF programme:', error);
    showToast('Erreur lors de la génération du PDF', 'error');
  }
}

/**
 * Vérifier si on doit faire un saut de page
 */
function checkPageBreak(doc, yPos, requiredSpace) {
  const pageHeight = doc.internal.pageSize.height;
  const margin = 20;
  
  if (yPos + requiredSpace > pageHeight - margin) {
    doc.addPage();
    return margin;
  }
  return yPos;
}

/**
 * Ajouter un pied de page
 */
function addFooter(doc) {
  const pageCount = doc.internal.getNumberOfPages();
  const pageHeight = doc.internal.pageSize.height;
  const pageWidth = doc.internal.pageSize.width;
  
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.setFont(undefined, 'normal');
    
    // Ligne de séparation
    doc.setDrawColor(200, 200, 200);
    doc.line(20, pageHeight - 15, pageWidth - 20, pageHeight - 15);
    
    // Texte pied de page
    doc.text('KINESIA - Plateforme de gestion des consultations kinésithérapie', 20, pageHeight - 10);
    doc.text(`Page ${i} / ${pageCount}`, pageWidth - 20, pageHeight - 10, { align: 'right' });
  }
}