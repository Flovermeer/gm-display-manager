# Stack technique — DM Campaign & Display Manager

## Objectif

Créer une application desktop locale pour préparer et piloter une campagne de JDR en présentiel.

L'application doit couvrir deux besoins principaux :

1. **Gestion de campagne / notes**
   - campagnes ;
   - PNJ ;
   - lieux ;
   - scènes ;
   - factions ;
   - quêtes ;
   - rencontres ;
   - documents / handouts ;
   - notes riches avec liens entre entités.

2. **Régie d'affichage**
   - PC portable du MJ comme poste de contrôle ;
   - écran horizontal dans la table pour la battlemap ;
   - petit écran côté joueurs pour portraits de PNJ, illustrations de lieux, documents et ambiance ;
   - affichage et transitions pilotés depuis l'application.

Foundry VTT reste séparé et sert principalement à la battlemap, au fog of war et éventuellement au combat / règles D&D.

---

# Stack retenue

## 1. Desktop shell

### Tauri 2

Responsabilités :

- créer l'application desktop ;
- gérer plusieurs fenêtres ;
- détecter les moniteurs ;
- positionner une fenêtre sur un écran donné ;
- passer un display en plein écran ;
- communiquer entre les différentes fenêtres ;
- accéder au filesystem local ;
- accéder à SQLite ;
- exposer des commandes natives au frontend.

Tauri sert principalement de **couche desktop / native**.

La majorité de la logique applicative reste côté TypeScript.

---

## 2. Frontend

### Angular

Version : utiliser la version stable actuelle au démarrage du projet.

Architecture :

- standalone components ;
- Angular Router ;
- services ;
- Signals pour l'état applicatif ;
- composants réutilisables.

Les styles partagés suivent une convention BEM et sont rangés par niveau Atomic Design dans
`src/styles/` :

- `_tokens.scss` centralise les variables visuelles ;
- `_atoms.scss` contient les éléments indivisibles (titres, boutons, champs) ;
- `_molecules.scss` assemble les petits groupes d'interface (barres d'actions, états vides) ;
- `_organisms.scss` définit les grands layouts réutilisés, notamment `.entity-workspace`.

Les feuilles SCSS des composants conservent uniquement leurs styles métier spécifiques. Un
élément du layout commun utilise le bloc BEM `.entity-workspace` plutôt qu'une nouvelle copie de
la structure dans chaque vue.

Les primitives Angular réutilisables sont regroupées dans `src/app/shared/ui/`. Les éléments qui
doivent conserver leur sémantique HTML native, comme les boutons, utilisent une directive
d'attribut. Les compositions répétées, comme un titre de fiche, un état vide ou un dialogue,
utilisent des composants standalone de présentation avec projection de contenu.

L'application Angular suit une organisation **feature-first** :

```text
src/app/
├── core/                 # infrastructure globale et navigation
├── features/
│   └── <feature>/
│       ├── domain/       # modèles et règles pures
│       ├── application/  # services et orchestration des cas d'usage
│       ├── data-access/  # ports et adaptateurs SQLite, Tauri ou mémoire
│       ├── pages/        # composants accessibles par le router
│       └── ui/           # composants propres à la feature
└── shared/
    ├── rich-text-editor/  # primitives riches transversales
    └── ui/                # composants visuels réutilisables
```

Les imports internes utilisent l'alias unique `@app/...`, afin de conserver des chemins lisibles
sans masquer la structure réelle du projet derrière de nombreux alias.

Les services, contexts, stores, guards, repositories et gateways comportent un en-tête court
`But / Responsabilités`. Les composants Angular et les simples modèles ne répètent pas de
documentation évidente.

Pas de NgRx au départ.

Exemples d'état global :

```ts
currentCampaign;
currentScene;
currentLocation;
activeNpc;
playerDisplayState;
selectedDisplay;
```

Principales vues prévues :

```text
Dashboard
Campagnes
Sessions
PNJ
Lieux
Scènes
Factions
Quêtes
Rencontres
Documents
Régie d'affichage
Paramètres
```

---

## 3. Éditeur de notes

### Tiptap

Utilisé pour avoir un véritable éditeur rich-text.

Objectif : **ne jamais devoir écrire du Markdown**.

Fonctionnalités souhaitées :

- titres ;
- gras / italique ;
- listes ;
- tableaux ;
- images ;
- citations ;
- liens ;
- blocs personnalisés ;
- liens dynamiques entre entités.

Exemple futur :

```text
Wakanga connaît @Syndra Silvane.
```

Quand le MJ tape `@Syn`, l'application propose les entités correspondantes.

Le lien est ensuite enregistré comme une référence structurée et non comme du Markdown visible.

Le contenu des notes peut être stocké sous forme de **JSON Tiptap / ProseMirror**.

---

# 4. Base de données

### SQLite

Base embarquée locale.

Aucun serveur SQL à lancer.

Pas besoin de :

- PostgreSQL ;
- MySQL ;
- Docker ;
- serveur distant ;
- API REST.

SQLite stocke les données structurées.

Exemples d'entités :

```text
GameSystem
GameUniverse
Campaign
Session
Npc
Monster
Location
Scene
Faction
Quest
Encounter
Handout
Tag
Relation
```

Les ressources partageables appartiennent à un univers et leur contexte appartient à la campagne :

```ts
Npc {
  id
  universeId
  name
  portraitPath
  idleVideoPath
  sheetJson
}

CampaignNpc {
  campaignId
  npcId
  status
  roleSummary
}

Monster {
  id
  universeId
  name
  imagePath
  sheetJson
}

CampaignMonster {
  campaignId
  monsterId
}
```

---

## 5. Accès à SQLite

### Tauri SQL plugin / SQLx

Architecture :

```text
Angular
   ↓
Tauri
   ↓
SQLite
```

Pas d'API HTTP locale entre Angular et la base.

Le frontend appelle les commandes / plugins Tauri nécessaires pour lire et écrire les données.

Une couche repository / service devra isoler l'accès aux données du reste de l'application.

Exemple :

```text
NpcService
    ↓
NpcRepository
    ↓
Tauri / SQLite
```

---

# 6. Médias

### Filesystem local

Les gros médias ne doivent pas être stockés directement dans SQLite.

Formats envisagés :

```text
.webp
.png
.jpg

.webm
.mp4

.mp3
.ogg
```

SQLite conserve uniquement :

- chemin du fichier ;
- type ;
- métadonnées ;
- relation avec l'entité.

Exemple :

```text
campaigns/
└── tomb-of-annihilation/
    ├── portraits/
    ├── animations/
    ├── locations/
    ├── maps/
    ├── handouts/
    └── audio/
```

---

# 7. Affichage multi-écrans

Tauri gère les displays.

Configuration prévue :

```text
Display 1
→ Laptop MJ

Display 2
→ Battlemap horizontale

Display 3
→ Écran narratif joueurs
```

Il ne faut pas supposer que les numéros Windows resteront constants.

Prévoir une interface permettant d'associer un rôle à chaque moniteur :

```text
[ Écran Dell 1920x1080 ] → MJ
[ ASUS 27" ]             → Battlemap
[ Portable 15.6" ]       → Player Display
```

La configuration est persistée localement.

---

# 8. Écran narratif joueurs

Le Player Display est une fenêtre Tauri dédiée, sans contrôles visibles.

Il peut afficher :

```text
Blank
Location
NPC
Item
Document
Ambience
Video
```

Exemple de composition :

```text
┌────────────────────────────────┐
│                                │
│        illustration lieu       │
│                                │
│          portrait PNJ          │
│                                │
│        WAKANGA O'TAMU          │
│                                │
└────────────────────────────────┘
```

Le MJ contrôle cet écran depuis son laptop.

---

# 9. Portraits animés

Les animations des PNJ sont générées **avant la partie**.

Pas de génération IA en temps réel.

Pour chaque PNJ important :

```text
wakanga/
├── portrait.webp
└── idle.webm
```

Animation recherchée :

- respiration légère ;
- clignements ;
- micro-mouvements ;
- vêtements / cheveux légèrement animés ;
- caméra fixe ;
- éventuellement ambiance du décor.

À éviter :

- lip-sync ;
- grands gestes ;
- travelling permanent ;
- animation trop spectaculaire.

L'image fixe sert de fallback si la vidéo ne peut pas être chargée.

---

# 10. Animations UI

### CSS en priorité

Pour :

- fade ;
- blur ;
- scale ;
- slide ;
- assombrissement du background.

### GSAP en option

À ajouter uniquement lorsque des transitions plus complexes deviennent nécessaires.

Exemples :

- timeline apparition lieu → PNJ → nom ;
- transitions cinématiques ;
- coordination de plusieurs éléments.

Ne pas ajouter GSAP tant que CSS suffit.

---

# 11. Foundry VTT

Foundry reste une application séparée.

Responsabilités de Foundry :

- battlemap ;
- grille ;
- fog of war ;
- éclairage ;
- maps animées ;
- tokens si nécessaires ;
- initiative / combat éventuellement ;
- règles D&D si utile.

Responsabilités du DM Campaign & Display Manager :

- notes ;
- campagne ;
- PNJ ;
- lieux ;
- relations ;
- scènes ;
- médias ;
- écran narratif ;
- régie.

Architecture :

```text
DM Campaign Manager
        +
Foundry VTT
```

Pas :

```text
DM Campaign Manager
      remplace
Foundry VTT
```

Une intégration Foundry pourra être envisagée plus tard.

---

# 12. Pas de backend web

Pour la première version :

**aucun backend Spring / Laravel / Node n'est nécessaire.**

L'application est :

```text
Angular
+ Tiptap
        ↓
     Tauri 2
        ↓
 SQLite + filesystem
        ↓
 Windows / displays
```

Aucun besoin de :

- REST API ;
- authentification ;
- serveur ;
- Docker ;
- cloud ;
- backend distant.

---

# 13. Quand un backend deviendrait utile

Un backend pourra être envisagé seulement si l'un de ces besoins apparaît :

- synchroniser les campagnes entre plusieurs PC ;
- préparer la campagne depuis un PC fixe et jouer depuis un laptop ;
- sauvegarde cloud ;
- travail à plusieurs MJ ;
- accès depuis une tablette / téléphone ;
- partage de contenu avec les joueurs ;
- application web distante.

À ce moment-là, une API pourrait être ajoutée.

Mais elle ne doit pas faire partie du MVP.

---

# 14. Architecture logique

```text
┌───────────────────────────────────────┐
│              ANGULAR                  │
│                                       │
│ Campaign UI                           │
│ NPC UI                                │
│ Location UI                           │
│ Tiptap Editor                         │
│ Display Control                       │
│                                       │
└──────────────────┬────────────────────┘
                   │
                   ▼
┌───────────────────────────────────────┐
│                TAURI                  │
│                                       │
│ Windows                               │
│ Displays                              │
│ Filesystem                            │
│ Native commands                       │
│ SQLite access                         │
│                                       │
└───────────────┬────────────┬──────────┘
                │            │
                ▼            ▼
             SQLite       Filesystem
                           Images
                           Videos
                           Audio
```

En parallèle :

```text
Foundry VTT
    ↓
Battlemap display
```

---

# 15. MVP technique recommandé

## Étape 1 — Shell desktop

- créer Angular ;
- intégrer Tauri ;
- lancer l'application desktop.

## Étape 2 — Multi-display

- détecter les moniteurs ;
- choisir le Player Display ;
- ouvrir une fenêtre fullscreen sur celui-ci.

Critère de validation :

> cliquer sur un bouton dans le laptop affiche une image sur le Player Display.

## Étape 3 — SQLite

Créer :

```text
Campaign
Npc
Location
```

CRUD minimal.

## Étape 4 — Tiptap

Ajouter un éditeur de notes riche pour :

- PNJ ;
- lieux.

Pas encore de liens intelligents.

## Étape 5 — Régie

Pouvoir cliquer sur :

```text
Afficher le PNJ
Afficher le lieu
Afficher un document
Noir
```

## Étape 6 — Médias animés

Support :

```text
portrait.webp
idle.webm
```

- fallback automatique.

## Étape 7 — Relations dynamiques

Ajouter les liens :

```text
NPC ↔ Location
NPC ↔ NPC
NPC ↔ Faction
Scene ↔ Location
Quest ↔ NPC
```

Puis autocomplete dans Tiptap.

## Étape 8 — Scènes

Une scène peut contenir :

```ts
Scene {
  id
  name
  locationId
  npcIds[]
  handoutIds[]
}
```

Le Player Display peut alors revenir automatiquement au lieu lorsque le PNJ est masqué.

---

# 16. Hors scope initial

Ne pas ajouter au début :

- Spring Boot ;
- Laravel ;
- Node backend ;
- Docker ;
- PostgreSQL ;
- cloud ;
- login ;
- Stream Deck ;
- appli mobile ;
- reconnaissance vocale ;
- génération IA live ;
- synchronisation automatique avec Foundry ;
- gestion complète des règles D&D ;
- audio multiroom ;
- Hue / WLED.

---

# 17. Résumé de la stack

```text
Desktop
→ Tauri 2

Frontend
→ Angular

État
→ Angular Signals + services

Éditeur rich-text
→ Tiptap

Base
→ SQLite

Accès DB
→ Tauri SQL plugin / SQLx

Médias
→ Filesystem local

Animations
→ CSS
→ GSAP si nécessaire

Battlemap
→ Foundry VTT séparé

Backend distant
→ aucun pour le MVP
```

---

# 18. Principe directeur

Le projet doit rester composé de trois responsabilités distinctes :

```text
Foundry
→ le plateau numérique

DM Campaign Manager
→ le cerveau documentaire du MJ

Player Display
→ la mise en scène pour les joueurs
```

Le but n'est pas de reconstruire Foundry, Obsidian ou Notion.

Le but est de créer un **outil de campagne local, agréable à utiliser pendant une partie physique, capable de piloter un écran narratif dédié**.
