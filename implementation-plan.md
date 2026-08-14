# Plan d'implémentation

Date de cadrage : 12 août 2026

Dernière consolidation : 14 août 2026

## Statut consolidé

| Jalon                       | Statut                                   | État réel                                                                                                                                                                                                        |
| --------------------------- | ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0 — Environnement           | Terminé                                  | Node 24 épinglé avec Volta, Angular 22, Rust stable MSVC, Build Tools et WebView2 validés.                                                                                                                       |
| 1 — Shell Angular + Tauri   | Terminé                                  | Application standalone zoneless, routes Angular, fenêtre principale maximisée et capabilities Tauri en place.                                                                                                    |
| 2 — Multi-écran             | Fonctionnel, validation avancée restante | Détection, choix persistant du moniteur et fenêtre joueurs dédiée plein écran validés sur le matériel nominal. Restent les cas de déconnexion, remplacement, coordonnées négatives et facteurs d’échelle variés. |
| 3 — Régie verticale         | Terminé                                  | Écran noir, lieux, PNJ et objets peuvent être envoyés au Player Display ; synchronisation `ready` et fallback statique des PNJ en place.                                                                         |
| 4 — SQLite                  | Terminé pour les tranches livrées        | Quatorze migrations couvrent notamment systèmes, univers, campagnes et catalogues partagés avec contexte de campagne. Repositories Tauri et mémoire isolés derrière des interfaces.                              |
| 5 — Gestion de campagne     | Terminé et étendu                        | CRUD campagnes, lieux hiérarchiques, PNJ structurés, PJ orientés MJ et objets narratifs. Navigation campagne persistante et protection des modifications non enregistrées.                                       |
| 6 — Médias locaux           | Terminé pour images et portraits animés  | Import/copie locale des portraits PNJ/PJ, images de lieux et d’objets, vidéo idle PNJ et nettoyage des médias. Une validation plus large des fichiers cassés reste à inclure au durcissement.                    |
| 7 — Tiptap et journal       | Terminé pour l’usage actuel              | Chapitres et descriptions riches, notes journalisées éditables, regroupement quotidien, mentions `@` cliquables vers les ressources de campagne et fallback texte si la cible disparaît.                         |
| 8 — Scènes                  | Terminé                                  | Composition facultative lieu + PNJ + monstres + objets, activation/désactivation et retour à l’écran par défaut sont livrés.                                                                                     |
| 9 — Bestiaire               | En cours, socle fonctionnel livré        | Catalogue canonique par univers, sélection par campagne, fiche D&D, illustration, scènes, notes journalisées et mentions `@` sont disponibles. Restent les blocs détaillés de capacités et d’actions.            |
| 10 — Combat léger           | Planifié après le bestiaire              | Le tracker réunira les PJ, PNJ et monstres ; le bestiaire doit donc être disponible avant cette tranche.                                                                                                         |
| 11 — Historique récent      | Planifié après le combat                 | Pills cliquables des dernières ressources consultées sous la navigation de campagne.                                                                                                                             |
| 12 — Carte heuristique      | Planifiée après l’historique             | Graphe automatique et navigable des chapitres, ressources liées et mentions `@`, sans édition manuelle du graphe.                                                                                                |
| 13 — Tables aléatoires      | À cadrer après la carte                  | Outil de préparation et de tirage pour les tables propres à la campagne ; modèle, types de résultats et historique des tirages restent à définir.                                                                |
| 14 — Durcissement/livraison | Non commencé                             | Sauvegarde/restauration, tests matériels dégradés, session longue, journal technique, installeur Windows et guide de dépannage restent à faire.                                                                  |

### Tranches supplémentaires déjà livrées

- écran d’accueil et CRUD complet des campagnes ;
- fiches PNJ D&D 5e structurées, tags, capacités/actions riches et description officielle ;
- fiches PJ ciblées MJ avec portrait, statistiques utiles, validations explicites et suivi persistant des PV ;
- arborescence et réordonnancement manuel des chapitres ;
- journal global chronologique et notes liées aux ressources ;
- objets narratifs avec type et rareté configurables par campagne, statut, harmonisation, détenteur unique, image et notes ;
- panneau Configuration avec navigation latérale et accordéons ;
- composants UI partagés pour boutons, dialogues, titres, états vides, champs Reactive Forms, tags et pills ;
- navigation Retour commune aux écrans d’une campagne.
- configuration globale des systèmes et univers avec corbeille, restauration et purge ;
- ressources partagées par univers et associations explicites aux campagnes.

### Prochaine priorité recommandée

Le prochain ordre de livraison retenu est :

1. **Jalon 9 — Bestiaire**, en réutilisant les fondations de la tranche PNJ sans recopier son workspace ;
2. **Jalon 10 — Combat léger**, alimenté par les PJ, les PNJ et le Bestiaire ;
3. **Jalon 11 — Historique récent**, pour accélérer la navigation pendant la partie ;
4. **Jalon 12 — Carte heuristique**, générée depuis les chapitres, les ressources liées et les mentions `@` ;
5. **Jalon 13 — Tables aléatoires**, à cadrer fonctionnellement après la carte ;
6. **Jalon 14 — Durcissement et livraison Windows**.

Les tables aléatoires sont désormais inscrites dans la séquence, mais leur modèle et leur expérience d’utilisation seront décidés avec le MJ au début du jalon 13.

## 1. Résultat recherché

Construire progressivement une application Windows locale qui permet au MJ de :

- préparer des campagnes, PNJ, lieux, scènes et médias ;
- sélectionner un écran narratif parmi les moniteurs disponibles ;
- afficher en un clic un lieu, un PNJ, un document ou un écran noir ;
- conserver Foundry VTT comme application séparée pour la battlemap.

Le premier objectif n'est pas le gestionnaire de campagne complet. La priorité est de lever le principal risque technique : piloter de façon fiable une fenêtre plein écran sur un autre moniteur.

## 2. Principes de conduite

- Cible initiale : Windows desktop uniquement.
- Progression par tranches verticales utilisables et vérifiables.
- Angular contient l'état métier et l'interface ; Tauri reste la frontière desktop/native.
- Les fonctionnalités natives sont isolées derrière des interfaces TypeScript afin de pouvoir tester le reste sans Tauri.
- SQLite stocke les données structurées ; le filesystem stocke les médias.
- Toute dépendance ou tout outil à installer est expliqué puis installé par l'utilisateur.
- Aucun backend HTTP, cloud, login, NgRx ou intégration Foundry dans le MVP.

## 3. Architecture cible

### 3.1 Deux fenêtres, une application Angular

Une seule application Angular fournit deux routes :

```text
/campaigns              -> accueil et création des campagnes
/campaigns/:campaignId  -> panneau de contrôle du MJ
/player-display         -> rendu sans contrôles sur l'écran des joueurs
```

Tauri ouvre deux `WebviewWindow` distinctes. La route détermine le rôle de chaque fenêtre.

```text
Control Panel
    |
    | PlayerDisplayCommand
    v
DisplayGateway (adaptateur Tauri)
    |
    | événement ciblé vers "player-display"
    v
Player Display Store (Signals)
    |
    v
Renderer Angular
```

La fenêtre joueurs émet un événement `ready` après son initialisation. Le panneau MJ lui renvoie alors l'état complet courant. Ce mécanisme évite de perdre une commande si la fenêtre vient d'être créée ou rechargée.

### 3.2 Contrat d'affichage

Le Player Display consomme un état complet plutôt qu'une succession d'ordres impératifs :

```ts
type PlayerDisplayState =
  | { mode: 'blank' }
  | { mode: 'location'; locationId: string; imagePath: string; name?: string }
  | {
      mode: 'npc';
      npcId: string;
      name: string;
      portraitPath: string;
      idleVideoPath?: string;
      backgroundPath?: string;
    }
  | { mode: 'document'; mediaId: string; filePath: string; name?: string };
```

Ce contrat évoluera de façon compatible lorsque les scènes et les transitions seront ajoutées.

### 3.3 Frontières applicatives

```text
UI Angular
  -> application services
      -> repositories       -> SQLite
      -> display gateway    -> Tauri windows/events
      -> media gateway      -> Tauri filesystem/dialog
```

Les composants Angular ne doivent pas appeler directement SQLite, le filesystem ou les API Tauri.

## 4. Gestion de l'environnement

Node et Angular sont gérés par l'utilisateur avec Volta. L'agent ne doit pas se préoccuper des versions globales actuellement actives ni proposer de les modifier. Au démarrage du projet, l'utilisateur sélectionnera et épinglera lui-même les versions compatibles souhaitées.

La partie native de Tauri a été vérifiée le 12 août 2026 : Rust/Cargo 1.97.1 utilisent la toolchain stable `x86_64-pc-windows-msvc`, Microsoft Visual C++ Build Tools est disponible et WebView2 Runtime est installé. Angular 22 utilise Node.js 24.15.0, épinglé localement avec Volta.

Toute installation constitue un arrêt obligatoire : l'agent explique le besoin et donne les commandes exactes, puis l'utilisateur les exécute et confirme le résultat.

État au 13 août 2026 : le workspace Angular standalone zoneless et le shell Tauri sont initialisés. Le premier lancement et la compilation Tauri ont réussi. Le chemin nominal du jalon 2 a également été validé manuellement : les moniteurs sont détectés et la fenêtre joueurs s'ouvre en plein écran sur le moniteur sélectionné sans remplacer le panneau MJ. Les scénarios matériels avancés du jalon 2 restent à vérifier. Le jalon 3 est validé manuellement : le contrat d'état complet, les stores Signals et la synchronisation `ready` permettent d'enchaîner lieu, PNJ et écran noir depuis le panneau MJ, puis de restaurer l'état courant lorsque la fenêtre joueurs est ouverte. Le jalon 4 est commencé : la migration V1 crée `app_setting` et la préférence de moniteur est persistée via un repository isolant le plugin SQLite. La restauration après redémarrage complet est validée manuellement. La migration V2 crée `campaign`, les migrations V3, V4 et V6 couvrent les PNJ, leur portrait statique et leur vidéo idle facultative, la migration V5 crée les lieux hiérarchiques avec leur illustration et la migration V7 ajoute les fiches PJ orientées MJ avec PV persistants. L'accueil fournit le CRUD complet des campagnes, avec suppression en cascade des données et nettoyage des médias après confirmation. La dernière campagne ouverte est mémorisée sans court-circuiter l'accueil au démarrage. La navigation persistante présente le plan complet du gestionnaire et active les sections livrées. Les tranches PNJ et Lieux permettent la recherche, la création, la lecture, la modification, la suppression, l'import local de visuels statiques ou animés et leur affichage sur l'écran joueurs, avec protection des brouillons et fallback statique. La fiche PNJ fournit désormais un bloc D&D 5e structuré, des listes sous forme de tags, des sections riches répétables pour les capacités et actions et une description officielle riche séparée des notes privées du MJ, tout en restant compatible avec les anciennes fiches JSON vides. La tranche PJ fournit le CRUD, un résumé permanent du groupe, une fiche de référence D&D 5e ciblée pour le MJ et la correction ou remise au maximum des PV persistants. La migration V10 et le Journal remplacent les anciennes notes libres par des entrées riches datées, globales ou rattachées à une fiche PNJ, lieu ou PJ, avec modification et suppression confirmée. Le Journal les regroupe par journée dans des accordéons : les notes générales sont affichées intégralement et les notes liées deviennent des aperçus cliquables insérés selon leur timestamp.

La navigation et le chargement de la campagne sont centralisés dans une route layout
`campaigns/:campaignId` avec un contexte partagé par ses pages enfants. L'accueil des campagnes et
le Player Display restent volontairement hors de ce layout.

## 5. Jalons d'implémentation

### Jalon 0 — Environnement reproductible

Objectif : disposer d'une base de développement compatible avant de générer du code.

Travail :

- laisser l'utilisateur sélectionner et épingler Node et Angular avec Volta ;
- vérifier les prérequis Windows de Tauri ;
- installer Rust avec la toolchain stable MSVC ;
- décider de npm comme gestionnaire de paquets initial ;
- initialiser Git et ajouter un `.gitignore` adapté après génération du projet ;
- documenter les versions réellement retenues dans le README.

Critères de validation :

- les versions Node et Angular choisies par l'utilisateur sont actives dans le projet ;
- `rustc --version` et `cargo --version` répondent dans un nouveau terminal ;
- le compilateur C++ et WebView2 nécessaires à Tauri sont disponibles ;
- le projet généré peut utiliser la toolchain sélectionnée.

Installation : entièrement réalisée par l'utilisateur.

### Jalon 1 — Shell Angular + Tauri

Objectif : ouvrir l'application Angular dans une fenêtre desktop Tauri.

Travail :

- générer un workspace Angular standalone avec Router et SCSS ;
- ajouter Tauri 2 au projet existant ;
- configurer les commandes de développement et de build ;
- créer les routes de l'accueil, du panneau de campagne et du Player Display ;
- afficher une page minimale différente selon le rôle de la fenêtre ;
- limiter les capabilities Tauri aux permissions réellement utilisées.

Critères de validation :

- Angular fonctionne seul dans le navigateur ;
- l'application Tauri démarre et affiche l'accueil `/campaigns` ;
- le build Angular et la compilation Tauri passent ;
- aucune logique métier ni dépendance UI supplémentaire n'est encore ajoutée.

Installation : Angular/Tauri et leurs paquets seront installés par l'utilisateur à ce jalon.

### Jalon 2 — Détection et placement multi-écran

Objectif : choisir un moniteur et y ouvrir le Player Display.

Travail :

- créer un `DisplayGateway` et son adaptateur Tauri ;
- lire les moniteurs via `availableMonitors()` ;
- convertir le résultat natif en `MonitorDescriptor` indépendant de Tauri ;
- afficher nom, résolution, position, facteur d'échelle et statut principal ;
- permettre au MJ de choisir le moniteur narratif ;
- créer ou retrouver la fenêtre `player-display` avec un label stable ;
- la positionner, retirer ses décorations et la passer en plein écran ;
- prévoir les cas zéro, un ou plusieurs moniteurs ;
- ne pas utiliser le numéro Windows du moniteur comme identité durable.

Empreinte provisoire d'un moniteur : nom + résolution physique + facteur d'échelle. Si plusieurs écrans restent impossibles à distinguer, l'interface demandera une nouvelle sélection au lieu de deviner.

Critères de validation manuelle :

- le sélecteur reflète les moniteurs réellement connectés ;
- la fenêtre s'ouvre sur le moniteur choisi, y compris avec des coordonnées négatives ;
- le facteur d'échelle Windows ne décale pas la fenêtre ;
- fermer et rouvrir le Player Display ne crée pas de doublon ;
- si l'écran configuré manque, l'application reste contrôlable sur l'écran principal.

### Jalon 3 — Première tranche verticale de régie

Objectif : atteindre la preuve de concept définie dans les spécifications.

Travail :

- créer le contrat `PlayerDisplayState` ;
- implémenter un store Signal côté panneau MJ et un autre côté Player Display ;
- envoyer des événements Tauri ciblés et typés côté TypeScript ;
- ajouter la synchronisation `player-display-ready -> état complet` ;
- fournir trois actions avec des médias de démonstration locaux : lieu, PNJ et noir ;
- rendre l'image avec `object-fit: contain` ou `cover` selon le mode ;
- ajouter uniquement un fondu CSS court ;
- afficher dans le panneau MJ l'état envoyé et la disponibilité de la fenêtre joueurs.

Critère de réussite :

> Un clic sur le laptop affiche immédiatement le bon visuel sur l'écran narratif, sans manipulation de fenêtre Windows.

Ce jalon clôt la preuve de concept multi-écran. Il doit être validé sur le matériel réel avant de commencer le gestionnaire de campagne.

### Jalon 4 — Persistance SQLite minimale

Objectif : remplacer les données de démonstration par des données locales persistantes.

Premier schéma :

```text
app_setting
campaign
location
npc
media_asset
```

Travail :

- ajouter le plugin SQL Tauri avec SQLite ;
- créer des migrations versionnées et transactionnelles ;
- définir les modèles de domaine sans types propres au plugin SQL ;
- créer les interfaces puis implémentations de repositories ;
- persister la campagne active et la préférence de moniteur ;
- ajouter des tests de mapping et de repositories ;
- gérer explicitement les erreurs de migration et d'ouverture de base.

Critères de validation :

- les données survivent à un redémarrage complet ;
- une base vide est initialisée automatiquement ;
- une erreur de persistance est visible et ne produit pas un faux succès dans l'UI ;
- les composants ne contiennent aucune requête SQL.

Installation : le plugin SQL JavaScript/Rust sera installé par l'utilisateur à ce jalon.

### Jalon 5 — Campagnes, lieux et PNJ

Objectif : préparer le contenu minimal nécessaire à une régie réelle.

Travail :

- lister, créer, modifier et supprimer une campagne ;
- lister, créer et modifier ses lieux et PNJ ;
- demander confirmation avant une suppression destructive ;
- utiliser des formulaires Angular typés avec validations simples ;
- fournir une navigation campagne -> lieux/PNJ -> fiche ;
- conserver des notes texte simples à ce stade ;
- alimenter la bibliothèque de régie depuis la campagne active.

Critères de validation :

- deux campagnes ne mélangent jamais leurs entités ;
- un PNJ et un lieu enregistrés réapparaissent après redémarrage ;
- le panneau de régie peut sélectionner et afficher ces entités.

### Jalon 6 — Import et lecture des médias

Objectif : utiliser de vrais médias locaux de manière robuste et hors ligne.

Décision requise au début de ce jalon : copier les fichiers dans l'espace de données de l'application ou conserver des références vers leur emplacement d'origine. La copie est recommandée pour garantir la portabilité et limiter les liens cassés.

Travail :

- ajouter l'accès contrôlé aux dialogues et au filesystem ;
- valider extension, type MIME et existence du fichier ;
- créer une arborescence stable par campagne ;
- générer des noms de fichiers internes sans collision ;
- enregistrer uniquement les chemins et métadonnées dans SQLite ;
- supporter `.webp`, `.png`, `.jpg`, `.webm` et `.mp4` dans un premier temps ;
- lire une vidéo en boucle, muette et sans contrôles ;
- basculer automatiquement vers le portrait statique si la vidéo échoue ;
- supprimer un fichier interne seulement après vérification de ses références.

Critères de validation :

- un média importé reste disponible hors ligne après redémarrage ;
- un chemin cassé produit un fallback explicite ;
- une vidéo défectueuse n'empêche pas le reste de la régie de fonctionner ;
- les permissions filesystem sont limitées aux dossiers nécessaires.

Installation : les plugins Tauri nécessaires au dialogue et au filesystem seront installés par l'utilisateur.

### Jalon 7 — Éditeur riche Tiptap

Objectif : remplacer les notes texte par un éditeur riche stocké en JSON.

Point de vigilance : la documentation officielle Tiptap classe Angular parmi les intégrations communautaires. Un court prototype isolé doit donc précéder l'intégration dans les fiches métier.

Approche recommandée : encapsuler directement le cœur framework-agnostique de Tiptap dans un composant Angular, avec création dans le cycle de vie du composant et destruction explicite. Cela évite de rendre le domaine dépendant d'un wrapper Angular tiers.

Périmètre initial :

- paragraphes et titres ;
- gras et italique ;
- listes ;
- citations et liens ;
- sauvegarde du JSON Tiptap avec un numéro de version de schéma ;
- lecture seule fiable.
- ordre manuel persistant avec actions Monter et Descendre sur le chapitre sélectionné ;

Contrat retenu pour les liens réactifs :

- une mention saisie avec `@` conserve le type de ressource, son identifiant stable et son libellé ;
- les premiers types raccordés sont les PJ, les PNJ et les lieux, puis les objets utiliseront le même contrat ;
- les relations et la future carte heuristique sont dérivées des mentions présentes dans le JSON du chapitre ;
- si la ressource ciblée n'existe plus, son libellé reste lisible comme du texte normal et le chapitre ne devient jamais inutilisable ;
- les relations dérivées ne doivent pas imposer une clé étrangère qui empêcherait ce fallback.

Les tableaux, images intégrées, mentions `@entité` et blocs personnalisés sont différés.

Critères de validation :

- le JSON sauvegardé se recharge sans perte ;
- changer rapidement de fiche ne mélange pas le contenu ;
- l'éditeur libère correctement ses listeners ;
- les notes restent lisibles après redémarrage.

Installation : les paquets Tiptap seront installés par l'utilisateur après validation du prototype proposé.

### Jalon 8 — Scènes et composition narrative

Objectif : piloter un contexte de scène plutôt que des médias isolés.

Modèle minimal :

```ts
type Scene = {
  id: string;
  campaignId: string;
  name: string;
  locationId: string | null;
  npcIds: string[];
  itemIds: string[];
};
```

Décisions V1 confirmées :

- le lieu est facultatif dans le formulaire, mais la régie encourage son association ;
- les PNJ, monstres et objets narratifs associés sont triés alphabétiquement ;
- sélectionner une scène ouvre seulement sa fiche ; une action explicite l'active sur le Player Display ;
- l'activation affiche le lieu en fond lorsqu'il possède une image, sinon le brouillard Vanta violet par défaut ;
- un seul PNJ, monstre ou objet peut occuper le premier plan ; il n'apparaît jamais automatiquement ;
- masquer le premier plan conserve le fond de la scène ; l'écran noir reste une action de sécurité explicite ;
- la scène active est persistée, mais la fenêtre joueurs ne se rouvre pas automatiquement ; à sa réouverture, le fond est restauré sans premier plan ;
- supprimer la scène active ramène le Player Display au fond par défaut sans fermer sa fenêtre ;
- les changements utilisent une sortie à opacité `0` puis une entrée à opacité `1`, en 300 ms, et respectent `prefers-reduced-motion` ;
- les scènes possèdent des notes journalisées et sont disponibles dans les mentions `@`.

Travail :

- créer et éditer une scène ;
- afficher le lieu comme fond ;
- afficher un PNJ au premier plan avec son nom ;
- masquer le PNJ et revenir automatiquement au lieu ;
- mémoriser l'état narratif courant ;
- ajouter des transitions CSS coordonnées et respectueuses de `prefers-reduced-motion` ;
- gérer un média absent sans casser toute la composition.

Critère de validation :

> Lieu -> PNJ -> masquer le PNJ -> retour au lieu fonctionne sans autre action du MJ.

### Jalon 9 — Bestiaire

Objectif : ajouter un onglet **Bestiaire** distinct des PNJ pour
cataloguer les monstres et créatures réutilisables.

Principes retenus :

- réutiliser les composants partagés et les champs communs déjà éprouvés dans la tranche PNJ ;
- ne pas dupliquer `NpcWorkspace` ni créer une hiérarchie de classes artificielle entre PNJ et monstres ;
- conserver un modèle de monstre séparé, car sa fiche détaillée et son cycle de vie diffèrent de ceux d’un PNJ narratif ;
- permettre de relier les monstres aux chapitres et notes avec le même contrat de mentions `@` ;
- préparer explicitement l’ajout d’un ou plusieurs exemplaires d’un monstre au suivi de combat.

Première tranche livrée :

- `monster` contient la fiche canonique de l’univers et son illustration ;
- `campaign_monster` sélectionne explicitement les monstres utilisés par une campagne ;
- `scene_monster` relie une scène à ces mêmes fiches, sans clone ni état de combat ;
- l’espace Bestiaire permet de créer/modifier une fiche et d’ajouter ou retirer une fiche du
  catalogue de campagne ;
- la fiche reprend les données structurées utiles d’un bloc de statistiques D&D et conserve son
  JSON versionné.

Les notes journalisées sont affichées sous la fiche, apparaissent dans le Journal global et
ouvrent directement le monstre ciblé. Les monstres sont également proposés et navigables dans les
mentions `@`, avec le même fallback texte qu’une autre ressource supprimée.

Reste dans ce jalon : l’édition détaillée des blocs répétables (capacités, actions et réactions).

### Jalon 10 — Suivi de combat léger

Objectif : fournir au MJ un onglet **Combat** avec un panneau superposé
permettant de suivre rapidement les points de vie pendant une rencontre, sans
remplacer la gestion de combat de Foundry ni implémenter les règles complètes de
D&D.

Périmètre proposé, à confirmer avant l'implémentation :

- ajouter à une rencontre des PNJ de la campagne et des monstres ponctuels ;
- proposer une action explicite **Ajouter au combat** sur la fiche d'un PNJ ou
  d'un monstre ;
- proposer la même action directement sur chaque entrée de la liste latérale,
  sans remplacer le clic de sélection de la fiche ;
- afficher les combattants sous forme de liste compacte ;
- suivre leurs points de vie actuels et maximum ;
- appliquer rapidement des dégâts ou des soins ;
- conserver l'état temporaire du combat séparé de la fiche canonique du PNJ ;
- ouvrir et replier le panneau sans perdre le contexte de la page courante.

Décisions différées : comportement de l'action lorsqu'aucun combat n'est actif,
persistance d'une rencontre après fermeture, gestion des ajouts en double et de
plusieurs exemplaires d'un même monstre, initiative, états temporaires et contenu
éventuellement visible sur le Player Display.

### Jalon 11 — Historique récent

Objectif : retrouver rapidement les dernières ressources consultées pendant une partie.

Périmètre initial à confirmer au début du jalon :

- afficher sous la barre de navigation des pills cliquables pour les dernières ressources consultées ;
- couvrir PNJ, PJ, lieux, chapitres, objets, scènes et monstres ;
- dédupliquer une ressource revisitée et la replacer en tête ;
- décider du nombre maximum d’entrées, de la suppression manuelle et de la persistance entre lancements.

### Jalon 12 — Carte heuristique automatique

Objectif : fournir une vue navigable de la structure d’une campagne sans entretenir un second modèle manuel.

La carte est générée depuis l’arborescence des chapitres, leurs relations explicites et les mentions `@`. Les nœuds ouvrent les ressources correspondantes. Une cible supprimée reste lisible sous forme de texte et ne casse pas le graphe.

### Jalon 13 — Tables aléatoires

Objectif : permettre au MJ de préparer et utiliser des tables aléatoires propres à une campagne.

Cette tranche doit être cadrée avant implémentation. Il faudra notamment décider :

- si une table contient uniquement du texte ou peut cibler des ressources de campagne ;
- si les plages sont pondérées, basées sur une formule de dés ou les deux ;
- si les tables peuvent s’appeler entre elles ;
- si les tirages doivent être historisés dans le Journal ;
- si un résultat peut être envoyé au Player Display.

### Jalon 14 — Durcissement et livraison Windows

Objectif : rendre l'application fiable pendant une session réelle.

Travail :

- reprise après fermeture ou rechargement du Player Display ;
- récupération lorsqu'un moniteur est déconnecté ou remplacé ;
- journal local minimal avec messages compréhensibles ;
- sauvegarde et restauration d'une campagne ;
- contrôle des erreurs de base et de fichiers ;
- tests avec plusieurs facteurs d'échelle et dispositions Windows ;
- test d'une session simulée de plusieurs heures avec changements répétés ;
- création d'un paquet Windows installable ;
- rédaction d'un guide d'installation, de sauvegarde et de dépannage.

Critères de validation :

- aucune erreur non gérée pendant le scénario nominal ;
- la perte du second écran ne bloque pas le panneau MJ ;
- la sauvegarde peut être restaurée dans un dossier de données propre ;
- l'application packagée fonctionne sur une machine Windows cible.

## 6. Stratégie de tests

### Automatisables

- tests unitaires des stores Signals et services applicatifs ;
- validation des contrats d'événements ;
- sélection/reconnaissance d'un moniteur à partir de descripteurs simulés ;
- tests des repositories SQLite sur une base temporaire ;
- migrations d'une version de schéma à la suivante ;
- état narratif lieu/PNJ/retour au lieu ;
- fallback vidéo vers image ;
- isolation des données par campagne.

### Manuels obligatoires

- découverte de plusieurs moniteurs physiques ;
- placement avec écrans à gauche, à droite, au-dessus et avec coordonnées négatives ;
- facteurs d'échelle différents entre laptop et écran narratif ;
- déconnexion/reconnexion d'un écran ;
- plein écran, focus et absence de chrome Windows ;
- lecture vidéo longue sur le matériel cible ;
- validation du paquet Windows sur une autre machine.

## 7. Dépendances prévues et portes d'installation

| Besoin                    | Dépendance envisagée                    | Premier jalon | Décision                               |
| ------------------------- | --------------------------------------- | ------------: | -------------------------------------- |
| Frontend                  | Angular stable                          |             1 | Retenue                                |
| Desktop                   | Tauri 2 et API JavaScript               |             1 | Retenue                                |
| Persistance               | Plugin SQL Tauri, fonctionnalité SQLite |             4 | Retenue                                |
| Sélection/copie de médias | Plugins Dialog et Filesystem Tauri      |             6 | À confirmer selon le workflow d'import |
| Notes riches              | Tiptap core, ProseMirror et StarterKit  |             7 | Retenue avec prototype Angular         |
| Transitions complexes     | GSAP                                    |  Après le MVP | Ne pas installer tant que CSS suffit   |

Avant chaque ligne de ce tableau, l'agent doit présenter les paquets exacts, leurs responsabilités et les commandes. L'utilisateur effectue ensuite l'installation.

## 8. Décisions différées

À prendre uniquement lorsque le jalon concerné approche :

- identifiant final et nom public de l'application ;
- emplacement exact du dossier de données ;
- copie ou référencement des médias externes ;
- stratégie d'export : archive unique ou dossier portable ;
- politique de suppression des médias partagés ;
- comportement exact face à deux moniteurs matériellement identiques ;
- besoin d'un écran battlemap auxiliaire dans l'application ;
- intégration Foundry, raccourcis globaux ou télécommande après le MVP.

### Nice to have après le MVP

- remplacer certains champs texte des fiches système (espèce, classe et futurs référentiels) par
  des sélecteurs avec recherche et saisie libre de secours ;
- évaluer un catalogue local versionné et une récupération par API, en tenant compte du
  fonctionnement hors ligne, de la version du système, de la langue et de la licence des données ;
- isoler la source de ces référentiels derrière un service afin que les fiches enregistrées ne
  dépendent pas directement d'un fournisseur externe ;
- génération optionnelle d'une animation de PNJ à partir de son portrait statique avec LTX ;
- conserver l'import vidéo manuel et le portrait statique comme fallback, indépendamment de LTX ;
- explorer en premier un connecteur expérimental vers LTX Desktop lancé localement, isolé derrière
  un service de génération afin de ne pas coupler le domaine à son API interne ;
- réévaluer au moment de l'implémentation la stabilité de l'API locale de LTX Desktop et comparer
  avec un pipeline LTX local dédié ou l'API cloud officielle ;
- prévoir une génération asynchrone avec progression et annulation, puis copier le MP4 produit dans
  le dossier média de la campagne et l'associer au PNJ ;
- demander un choix explicite avant tout mode cloud en raison du coût, de la connexion requise et de
  l'envoi du portrait à un service distant.

## 9. Ordre de livraison

```text
Jalons 0 à 3  -> preuve de concept multi-écran
Jalons 4 à 6  -> MVP de régie avec contenu réel
Jalons 7 à 8   -> gestion de campagne et scènes narratives
Jalon 9        -> bestiaire réutilisable
Jalon 10       -> suivi de combat léger
Jalon 11       -> historique récent des ressources
Jalon 12       -> carte heuristique automatique
Jalon 13       -> tables aléatoires
Jalon 14       -> version Windows distribuable
```

On ne passe pas de la preuve de concept au gestionnaire de campagne tant que le flux `clic MJ -> écran joueurs` n'a pas été validé sur deux moniteurs physiques.

## 10. Références officielles vérifiées

- [Compatibilité des versions Angular](https://angular.dev/reference/versions)
- [Installation et environnement Angular](https://angular.dev/installation)
- [Prérequis Windows de Tauri](https://v2.tauri.app/start/prerequisites/)
- [Configuration d'un frontend pour Tauri](https://v2.tauri.app/start/frontend/)
- [API JavaScript des fenêtres Tauri](https://v2.tauri.app/reference/javascript/api/namespacewindow/)
- [Communication et événements Tauri](https://v2.tauri.app/develop/calling-rust/)
- [Plugin SQL et migrations Tauri](https://v2.tauri.app/plugin/sql/)
- [Installation de Tiptap](https://tiptap.dev/docs/editor/getting-started/install)
