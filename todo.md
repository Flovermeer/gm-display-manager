- supprimer l'ancien portrait d'un PNJ lorsqu'il est remplacé à l'enregistrement : aujourd'hui seule
  l'ancienne vidéo est nettoyée, ce qui laisse des fichiers orphelins dans le dossier de l'univers
- extraire le formulaire d'édition PNJ dans un composant `ui/` pour descendre `npc-workspace.ts`
  sous 600 lignes
- découper `universe-resource-editor.ts` (environ 900 lignes) selon le modèle façade + `ui/` + mapping
  de formulaire
- découper `src-tauri/src/backup.rs` (environ 1000 lignes) en modules archive, restauration et rotation
- poser des règles de dépendances entre features (nécessite d'installer ESLint)
- résoudre les avertissements de budget SCSS (`rich-text-editor.scss`, `campaign-home.scss`)
