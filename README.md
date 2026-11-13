# Beholder's Inn

Application desktop locale pour préparer une campagne de JDR et piloter un
écran narratif destiné aux joueurs. Foundry VTT reste séparé et conserve la
gestion de la battlemap, de la grille et du fog of war.

## Stack actuelle

- Angular 22, composants standalone et Router ;
- application zoneless ;
- Tauri 2 ;
- SQLite, Dialog et Filesystem via les plugins officiels Tauri ;
- Node.js 24.15.0 épinglé localement avec Volta ;
- Rust 1.88 minimum avec la toolchain Windows MSVC.

## Prérequis Windows

- Node.js 24.15.0 disponible via Volta ;
- Rust 1.88 ou plus récent et Cargo avec la cible `x86_64-pc-windows-msvc` ;
- Microsoft Visual C++ Build Tools ;
- Microsoft Edge WebView2 Runtime.

Les installations et mises à jour de dépendances sont toujours exécutées par
l'utilisateur.

## Installation

Depuis la racine du projet :

```powershell
npm.cmd install
```

Le champ `volta` de `package.json` sélectionne automatiquement Node 24 dans ce
projet sans imposer cette version ailleurs.

## Développement

Lancer Angular seul dans le navigateur :

```powershell
npm.cmd start
```

Routes actuelles :

- `http://localhost:4300/campaigns` : accueil et création des campagnes ;
- `http://localhost:4300/campaigns/:campaignId` : panneau du maître de jeu pour une campagne ;
- `http://localhost:4300/campaigns/:campaignId/locations` : gestion hiérarchique des lieux et de
  leur galerie d'images commune à l'univers ;
- `http://localhost:4300/campaigns/:campaignId/npcs` : gestion des PNJ de la campagne ;
- `http://localhost:4300/campaigns/:campaignId/player-characters` : fiches PJ utiles au MJ et
  suivi persistant de leurs points de vie ;
- `http://localhost:4300/campaigns/:campaignId/chapters` : chapitres, sections et classement des
  scènes ;
- `http://localhost:4300/campaigns/:campaignId/map` : carte automatique des chapitres et scènes ;
- `http://localhost:4300/campaigns/:campaignId/scenes` : préparation et activation des scènes ;
- `http://localhost:4300/campaigns/:campaignId/tables` : préparation et tirage privé des tables
  aléatoires de la campagne ;
- `http://localhost:4300/player-display` : rendu sans contrôles pour les joueurs.

Lancer Angular dans la fenêtre desktop Tauri :

```powershell
npm.cmd run tauri:dev
```

Le mode développement utilise l'identifiant `com.beholdersinn.app.dev` et un dossier de données
distinct de l'application installée. Sa base SQLite, ses médias, ses sauvegardes et ses journaux ne
peuvent donc pas migrer ou remplacer les données de production.

Le premier lancement télécharge et compile les crates Rust déclarées dans
`src-tauri/Cargo.toml`. Il peut donc prendre plusieurs minutes.

## Vérifications

```powershell
npm.cmd run lint
npm.cmd run build
npm.cmd run test -- --watch=false
cargo test --manifest-path src-tauri/Cargo.toml
```

Le développement courant se fait sur une branche dédiée. Toute pull request vers `main`
déclenche automatiquement la CI Windows, qui exécute le lint, ces tests et le build Angular. Un
push sur une autre branche ou directement sur `main` ne déclenche pas ce workflow.

`npm.cmd run lint` applique les règles recommandées d'Angular et de TypeScript, ainsi que les
frontières de couches décrites dans `AGENTS.md` : le `domain/` ne dépend ni d'Angular ni de Tauri,
et les pages et composants n'importent ni repository ni gateway. Ces règles sont définies dans
`eslint.config.js`.

Le comportement multi-écran devra être validé manuellement sur plusieurs
moniteurs physiques à partir du jalon 2.

## Installateur Windows

Pour produire localement l'installateur NSIS de la version courante :

```powershell
npm.cmd run tauri:build -- --bundles nsis
```

Le workflow `Windows installer` est déclenché manuellement. Depuis la racine du projet, avec GitHub
CLI authentifié :

```powershell
gh workflow run windows-installer.yml -R Flovermeer/gm-display-manager --ref main
```

Le workflow exécute les tests Angular, compile l'application en mode release et génère
l'installateur NSIS. Il conserve un artefact `beholders-inn-windows-installer` pendant quatorze
jours et publie aussi l'installateur dans une GitHub Release durable. Le dépôt étant privé, ces
téléchargements restent accessibles uniquement aux comptes GitHub autorisés. Un simple `git push`
ne déclenche pas ce workflow.

### Publier soi-même une nouvelle version

1. Choisir un nouveau numéro de version qui n'existe pas encore dans les Releases GitHub.
2. Reporter exactement ce numéro dans `package.json`, `package-lock.json`, `src-tauri/Cargo.toml`,
   `src-tauri/Cargo.lock` et `src-tauri/tauri.conf.json`.
3. Committer puis pousser les changements sur `main`.
4. Ouvrir [Actions → Windows installer](https://github.com/Flovermeer/gm-display-manager/actions/workflows/windows-installer.yml),
   cliquer sur **Run workflow**, sélectionner `main`, puis confirmer avec **Run workflow**.
5. Attendre que toutes les étapes soient vertes. Télécharger ensuite le `.exe` depuis la nouvelle
   [Release GitHub](https://github.com/Flovermeer/gm-display-manager/releases) ou télécharger
   l'artefact `beholders-inn-windows-installer` depuis le résumé du workflow.

La même opération peut être lancée en ligne de commande après authentification avec `gh auth login` :

```powershell
gh workflow run windows-installer.yml -R Flovermeer/gm-display-manager --ref main
gh run watch -R Flovermeer/gm-display-manager
```

La publication échoue si la Release `v<version>` existe déjà. Dans ce cas, incrémenter à nouveau les
cinq fichiers de version, commit, push, puis relancer le workflow. Ne pas créer le tag manuellement :
le workflow crée lui-même la Release et son tag après la construction réussie de l'installateur.

La procédure complète de versionnement, construction, installation, validation et publication est
documentée dans [`WINDOWS_RELEASE.md`](./WINDOWS_RELEASE.md).

## Documentation

- [`user-guide.md`](./user-guide.md) : installation, sauvegarde, dépannage et utilisation ;
- [`WINDOWS_RELEASE.md`](./WINDOWS_RELEASE.md) : construction et livraison de l'installateur Windows ;
- [`dm-display-manager-specs.md`](./dm-display-manager-specs.md) : vision produit ;
- [`dm-campaign-display-stack.md`](./dm-campaign-display-stack.md) : architecture cible ;
- [`implementation-plan.md`](./implementation-plan.md) : jalons et critères de validation ;
- [`domain-model.md`](./domain-model.md) : modèle métier et décisions de données.
