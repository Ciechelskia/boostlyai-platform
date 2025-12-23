# KINESIA - Transcription Intelligente de Consultations 🩺

Application web (PWA) qui permet d'enregistrer, transcrire et analyser des consultations médicales avec l'intelligence artificielle et génération de diagnostics préliminaires.

## 🎨 Identité Visuelle

- **Couleur principale** : Bleu médical #0EA5E9
- **Couleur accent** : Cyan #06B6D4
- **Dégradé signature** : `linear-gradient(135deg, #0EA5E9, #06B6D4)`

## ✨ Fonctionnalités

- ✅ Enregistrement audio en direct (navigateur)
- ✅ Upload de fichiers audio (max 50 MB)
- ✅ Transcription automatique via Whisper
- ✅ Génération de comptes-rendus structurés via Claude Sonnet 4
- ✅ **Base de connaissances** : Upload de cours, formations, protocoles (PDF)
- ✅ **Génération de diagnostics préliminaires** assistée par IA
- ✅ **Plans de traitement personnalisés** basés sur votre base de connaissances
- ✅ Extraction automatique des actions à faire
- ✅ Export en PDF professionnel
- ✅ Organisation par dossiers patients
- ✅ Recherche full-text dans les transcriptions
- ✅ PWA installable (fonctionne offline)

## 🩺 Spécificités Médicales

### Base de Connaissances
- Upload de PDF (cours, formations, protocoles)
- Recherche vectorielle (pgvector + OpenAI embeddings)
- Utilisée pour contextualiser les diagnostics

### Diagnostic IA
- Génération sur demande (bouton dans chaque consultation)
- Hypothèses diagnostiques avec niveau de confiance
- Diagnostics différentiels
- Tests cliniques recommandés
- Plans de traitement détaillés par phases
- **⚠️ Important** : Diagnostic préliminaire, doit être validé par le praticien

## 🛠️ Stack Technique

### Frontend
- HTML5 / CSS3 / JavaScript Vanilla
- Progressive Web App (PWA)
- MediaRecorder API
- Responsive Design (Mobile-First)

### Backend
- **Supabase** : PostgreSQL + pgvector + Auth + Storage
- **N8N** : 2 workflows (Transcription + Diagnostic)
- **OpenAI** : Whisper (transcription) + Embeddings (recherche)
- **Claude Sonnet 4** : Analyse + Diagnostic

## 📁 Structure du Projet

```
kinesia/
├── index.html              # Page d'accueil (redirection)
├── login.html              # Authentification
├── app.html                # Dashboard principal
├── consultation.html       # Détails d'une consultation
├── knowledge-base.html     # Gestion base de connaissances (NOUVEAU)
├── manifest.json           # Configuration PWA
├── sw.js                   # Service Worker
├── css/
│   ├── variables.css       # Variables CSS (bleu médical)
│   ├── reset.css          # Reset CSS
│   ├── global.css         # Styles globaux
│   ├── components.css     # Composants réutilisables
│   ├── login.css          # Styles page login
│   ├── app.css            # Styles dashboard
│   ├── consultation.css   # Styles page consultation
│   ├── knowledge-base.css # Styles gestion PDF (NOUVEAU)
│   └── diagnostic.css     # Styles diagnostic (NOUVEAU)
├── js/
│   ├── config.js          # Configuration (Supabase, N8N)
│   ├── supabase-client.js # Client Supabase
│   ├── auth.js            # Gestion authentification
│   ├── storage.js         # Upload fichiers Supabase
│   ├── recorder.js        # Enregistrement audio
│   ├── api.js             # Appels API (N8N webhook)
│   ├── consultations.js   # Logique métier consultations
│   ├── knowledge-base.js  # Gestion base de connaissances (NOUVEAU)
│   ├── diagnostic.js      # Logique diagnostic (NOUVEAU)
│   ├── pdf-export.js      # Export PDF
│   └── utils.js           # Fonctions utilitaires
└── assets/
    ├── images/            # Images, logos, icônes
    └── fonts/             # Polices personnalisées
```

## 🚀 Installation

### 1. Cloner le projet

```bash
git clone <repository-url>
cd kinesia
```

### 2. Configuration Supabase

Créer le projet Supabase "KINESIA" et exécuter les scripts SQL :
1. `kinesia-supabase-setup.sql` (tables + extensions)
2. `kinesia-storage-setup.sql` (buckets + policies)

### 3. Configuration

Vérifier que les credentials dans `js/config.js` sont corrects :

```javascript
const CONFIG = {
  SUPABASE_URL: 'https://rxrgbvoqubejvejsppux.supabase.co',
  SUPABASE_ANON_KEY: 'your-anon-key',
  N8N_WEBHOOK_TRANSCRIPTION: 'https://andreaprogra.app.n8n.cloud/webhook/kinesia-transcription',
  N8N_WEBHOOK_DIAGNOSTIC: 'https://andreaprogra.app.n8n.cloud/webhook/kinesia-diagnostic'
};
```

### 4. Lancer un serveur local

```bash
# Avec Python
python -m http.server 8000

# Avec Node.js (http-server)
npx http-server -p 8000

# Avec PHP
php -S localhost:8000
```

Accéder à l'application : `http://localhost:8000`

## 🩺 Utilisation

### 1. Créer une consultation
- Enregistrer en direct ou uploader un fichier audio
- Remplir les informations patient (anonymisé)

### 2. Ajouter des connaissances (optionnel)
- Aller dans "Base de connaissances"
- Uploader des PDF (cours, formations, protocoles)
- Ces documents seront utilisés pour les diagnostics

### 3. Générer un diagnostic
- Ouvrir une consultation terminée
- Cliquer sur "Générer diagnostic"
- L'IA analyse la consultation + base de connaissances
- Obtenir : diagnostic préliminaire + plan de traitement

### 4. Valider et exporter
- Vérifier et valider le diagnostic
- Exporter en PDF
- Partager avec confrères si besoin

## 💾 Base de Données

### Tables Communes (avec MEETIA)
- `profiles` - Profils utilisateurs
- `folders` - Dossiers patients
- `consultations` - Consultations enregistrées
- `transcripts` - Transcriptions
- `summaries` - Résumés IA

### Tables Spécifiques KINESIA
- `knowledge_base` - Base de connaissances (PDF + embeddings)
- `diagnostic_reports` - Diagnostics générés
- `diagnostic_revisions` - Historique modifications

### Storage Buckets
- `consultation-recordings` (Public) - Fichiers audio
- `knowledge-base` (Privé) - PDF cours/formations

## 🔧 Workflows N8N

### Workflow 1 : Transcription
```
Webhook → Download Audio → Whisper → Claude (Résumé) → Response
```

### Workflow 2 : Diagnostic (NOUVEAU)
```
Webhook → Create Embedding → Vector Search → Claude (Diagnostic) → Response
```

## 📊 Modèle Économique

### Plans d'abonnement

- **Free** : Illimité (pour beta)
- **Pro** : 29,99€/mois - 100 consultations/mois + diagnostics illimités
- **Business** : 79,99€/mois - Illimité

## ⚖️ Mentions Légales & Éthique

### ⚠️ TRÈS IMPORTANT

- Le diagnostic IA est **PRÉLIMINAIRE**
- **DOIT être validé** par un praticien diplômé
- Ne remplace PAS un examen clinique
- Le praticien reste responsable des décisions thérapeutiques
- Conformité RGPD + Données de santé

## 🔐 Sécurité

- Données chiffrées (Supabase)
- RLS (Row Level Security) actif
- Buckets Storage avec policies strictes
- Données médicales isolées (projet Supabase dédié)

## 🎯 Différences avec MEETIA

| Aspect | MEETIA | KINESIA |
|--------|--------|---------|
| **Public** | Professionnels (tous) | Professionnels de santé |
| **Couleurs** | Violet → Orange | Bleu → Cyan |
| **Analyse** | Résumé basique | Résumé + Diagnostic |
| **Base connaissances** | ❌ | ✅ PDF + Vector Search |
| **Workflows N8N** | 1 (transcription) | 2 (transcription + diagnostic) |
| **Réglementaire** | RGPD standard | RGPD + Données santé |

## 🚀 Déploiement

- **Frontend** : Vercel / Netlify
- **Backend** : Supabase (déjà en ligne)
- **Workflows** : N8N Cloud (déjà configuré)

## 📞 Support

Pour toute question : contact@kinesia.app

---

**Version** : 1.0.0  
**Dernière mise à jour** : Décembre 2024  
**Développeur** : Andrea