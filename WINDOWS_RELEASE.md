# Construire et livrer la version Windows

Ce guide décrit comment transformer Beholder's Inn en application Windows installable. Le format
de distribution retenu pour la version 1.1.6 est un installateur NSIS généré par Tauri.

## Choisir le bon mode d'exécution

Les commandes du projet ne produisent pas toutes le même résultat :

- `npm.cmd run build` compile uniquement le frontend Angular dans
  `dist/gm-display-manager/browser/` ;
- `npm.cmd run tauri:dev` démarre Angular sur `localhost:4300` et ouvre un exécutable Tauri de
  développement qui dépend de ce serveur et utilise l'identifiant isolé
  `com.beholdersinn.app.dev` ;
- `npm.cmd run tauri:build -- --bundles nsis` compile Angular, construit Tauri en mode release et
  génère un installateur Windows autonome.

L'exécutable debug situé dans `src-tauri/target/debug/` n'est pas distribuable : lancé seul, il
peut afficher une erreur de connexion à `localhost`. Pour installer et utiliser normalement
l'application desktop, il faut employer l'installateur NSIS.

Le dossier de données de développement est séparé de celui de la version installée. Il contient sa
propre base SQLite, ses médias, ses sauvegardes et ses journaux ; une migration exécutée en
développement ne peut donc plus rendre une ancienne version installée incompatible avec sa base.

## Prérequis pour construire localement

La machine de build Windows doit disposer des prérequis documentés dans le README :

- Node.js 24.15.0, sélectionné dans le projet avec Volta ;
- les dépendances npm déjà installées ;
- Rust 1.88 ou plus récent avec la cible MSVC ;
- Microsoft Visual C++ Build Tools ;
- Microsoft Edge WebView2 Runtime.

Les installations et mises à jour de ces outils ou dépendances restent effectuées par
l'utilisateur.

## Vérifier les numéros de version

Avant de construire une version distribuable, vérifier que la même version est déclarée dans :

- `package.json` et `package-lock.json` ;
- `src-tauri/Cargo.toml` et `src-tauri/Cargo.lock` ;
- `src-tauri/tauri.conf.json`.

Pour la livraison actuelle, cette version est `1.1.6`.

## Construire localement

Depuis la racine du dépôt :

```powershell
npm.cmd run test -- --watch=false
cargo test --manifest-path src-tauri/Cargo.toml
npm.cmd run tauri:build -- --bundles nsis
```

La dernière commande exécute automatiquement le build Angular configuré par
`beforeBuildCommand`, compile le shell Rust en mode release puis lance le bundler NSIS.

Les principaux fichiers produits sont :

```text
src-tauri/target/release/gm-display-manager.exe
src-tauri/target/release/bundle/nsis/*.exe
```

Le premier est l'exécutable release brut. Le fichier du dossier `bundle/nsis/` est l'installateur
à distribuer et à utiliser pour une installation Windows normale.

## Construire avec GitHub Actions

Le workflow `Windows installer` est la méthode recommandée pour obtenir l'artefact à tester et
publier la version privée. Il travaille dans un environnement Windows propre, réinstalle les
dépendances verrouillées, exécute les tests Angular et construit l'installateur NSIS.

Avec GitHub CLI authentifié :

```powershell
gh workflow run windows-installer.yml -R Flovermeer/gm-display-manager --ref main
```

Le workflow doit être déclenché explicitement : un simple `git push` ne le lance pas. Après son
succès, l'installateur est disponible à deux endroits :

- l'artefact ZIP `beholders-inn-windows-installer` de la page GitHub Actions, conservé quatorze
  jours ;
- la GitHub Release `v<version>`, conservée durablement dans le dépôt privé.

La publication échoue si une Release porte déjà cette version. Il faut incrémenter les cinq numéros
de version avant de relancer le workflow.

## Installer l'application

1. Fermer toute instance lancée avec `npm.cmd run tauri:dev`.
2. Si les données locales ont de la valeur, créer une sauvegarde depuis la Configuration de
   l'application avant de poursuivre.
3. Télécharger l'installateur `.exe` depuis la dernière Release privée, ou extraire l'artefact
   `beholders-inn-windows-installer` du workflow correspondant.
4. Exécuter l'installateur `.exe`. Pour une mise à jour, le lancer par-dessus l'installation
   existante sans désinstaller l'application.
5. Terminer l'installation puis ouvrir **Beholders Inn** depuis Windows.

Une fois installée, l'application n'a pas besoin de Node.js, npm, Rust ou du serveur Angular. Elle
continue toutefois de dépendre du runtime WebView2 fourni ou maintenu par Windows.

## Installateur non signé

L'installateur 1.1.6 n'est pas signé. Microsoft Defender SmartScreen peut donc afficher un
avertissement de réputation. Avant de poursuivre, vérifier que le fichier provient bien du workflow
du dépôt et que son exécution s'est terminée avec succès.

Si Smart App Control bloque complètement le fichier, ne pas désactiver cette protection pour ce
seul test. Utiliser une machine de validation compatible ou signer une future distribution.

## Checklist de validation de l'installation

Après l'installation, vérifier au minimum :

- le lancement depuis le menu Démarrer, sans dépendance à `localhost:4300` ;
- l'ouverture, la création et la modification d'une campagne ;
- la persistance des changements après fermeture et relance ;
- la détection des moniteurs ;
- l'ouverture et la fermeture du Player Display ;
- l'affichage d'un lieu, d'un PNJ et de l'écran noir ;
- la lecture d'une vidéo PNJ et son fallback statique ;
- la création d'une sauvegarde ;
- le diagnostic des médias ;
- la présence de Beholders Inn dans les applications installées de Windows.

Les tests impliquant plusieurs moniteurs physiques restent des validations manuelles.

## Distribution privée et mises à jour

La décision actuelle est de conserver le code et les installateurs privés. Une GitHub Release créée
dans ce dépôt hérite de sa visibilité : seuls les comptes GitHub autorisés peuvent la consulter et
télécharger l'installateur. Ne pas copier l'installateur vers un dépôt public ni vers un hébergement
accessible anonymement.

La mise à jour reste volontairement manuelle : télécharger la nouvelle Release en étant connecté à
GitHub, fermer Beholder's Inn, puis exécuter le nouvel installateur par-dessus la version existante.
Les données applicatives restent séparées des fichiers installés dans le dossier de données Tauri.
Créer néanmoins une sauvegarde depuis l'application avant chaque mise à jour.

## Évolution possible vers un updater automatique

Si l'application est un jour distribuée publiquement, le chemin prévu est le plugin officiel Tauri
Updater avec des artefacts signés et un manifeste `latest.json`. Cette évolution nécessitera :

- une source de téléchargement accessible par les installations sans secret embarqué ;
- `@tauri-apps/plugin-updater` et `tauri-plugin-updater` ;
- `bundle.createUpdaterArtifacts` dans la configuration Tauri ;
- la clé publique et l'endpoint de mise à jour dans `tauri.conf.json` ;
- la clé privée et sa phrase secrète dans les secrets du workflow de publication ;
- un dialogue explicite dans l'application et une sauvegarde automatique avant installation.

Une paire de clés préparatoire existe localement sous
`%USERPROFILE%\.tauri\beholders-inn.key` et `.pub`. La clé privée ne doit jamais être ajoutée au
dépôt. Tant qu'aucune version avec updater n'a été distribuée, cette paire peut être remplacée. Dès
la première publication compatible, elle devra être sauvegardée durablement : sa perte empêcherait
de signer les mises à jour destinées aux installations existantes.
