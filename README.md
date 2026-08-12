# Beholder's Inn

Application desktop locale pour préparer une campagne de JDR et piloter un
écran narratif destiné aux joueurs. Foundry VTT reste séparé et conserve la
gestion de la battlemap, de la grille et du fog of war.

## Stack actuelle

- Angular 22, composants standalone et Router ;
- application zoneless ;
- Tauri 2 ;
- Node.js 24.15.0 épinglé localement avec Volta ;
- Rust stable avec la toolchain Windows MSVC.

## Prérequis Windows

- Node.js 24.15.0 disponible via Volta ;
- Rust et Cargo avec la cible `x86_64-pc-windows-msvc` ;
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

- `http://localhost:4200/control` : panneau du maître de jeu ;
- `http://localhost:4200/player-display` : rendu sans contrôles pour les joueurs.

Lancer Angular dans la fenêtre desktop Tauri :

```powershell
npm.cmd run tauri dev
```

Le premier lancement télécharge et compile les crates Rust déclarées dans
`src-tauri/Cargo.toml`. Il peut donc prendre plusieurs minutes.

## Vérifications

```powershell
npm.cmd run build
npm.cmd run test -- --watch=false
```

Le comportement multi-écran devra être validé manuellement sur plusieurs
moniteurs physiques à partir du jalon 2.

## Documentation

- [`user-guide.md`](./user-guide.md) : lancement et utilisation de la preuve de concept ;
- [`dm-display-manager-specs.md`](./dm-display-manager-specs.md) : vision produit ;
- [`dm-campaign-display-stack.md`](./dm-campaign-display-stack.md) : architecture cible ;
- [`implementation-plan.md`](./implementation-plan.md) : jalons et critères de validation ;
- [`domain-model.md`](./domain-model.md) : modèle métier et décisions de données.
