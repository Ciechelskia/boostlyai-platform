const SUPABASE_CONFIG = {
    url: 'https://alsyhwaplkwmwddirxwu.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFsc3lod2FwbGt3bXdkZGlyeHd1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAwMzAxODQsImV4cCI6MjA3NTYwNjE4NH0.JeslV19KvDdkgPfseejfrJB_hExec936zaGemAhqU4w'
};

// Attendre que Supabase soit chargé
function initSupabase() {
    console.log('🔄 Initialisation Supabase...');
    
    // Vérifier que la librairie Supabase est chargée
    if (typeof window.supabase === 'undefined' || typeof window.supabase.createClient !== 'function') {
        console.error('❌ Librairie Supabase non disponible');
        return false;
    }
    
    try {
        // Créer le client Supabase
        const supabaseClient = window.supabase.createClient(
            SUPABASE_CONFIG.url,
            SUPABASE_CONFIG.anonKey
        );
        
        // IMPORTANT : Créer les 2 variables globales
        window.supabase = supabaseClient;
        window.supabaseClient = supabaseClient;
        
        console.log('✅ Supabase initialisé pour VOCALIA');
        return true;
    } catch (error) {
        console.error('❌ Erreur initialisation Supabase:', error);
        return false;
    }
}

// Exporter la configuration
window.SUPABASE_CONFIG = SUPABASE_CONFIG;
window.initSupabase = initSupabase;

// Initialiser dès que le DOM est prêt
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSupabase);
} else {
    initSupabase();
}