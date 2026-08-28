# Journal et plan d'implémentation

Date de cadrage : 12 août 2026

Dernière consolidation : 24 août 2026

Version fonctionnelle actuelle : **V1 terminée**

Version en cours : **V1.1 — Durcissement et livraison Windows**

Développement fonctionnel : **Jalon 12 — Carte heuristique terminée**

## Journal des versions

### V1 — Terminée le 21 août 2026

La V1 fournit le parcours jouable complet retenu pour le premier usage en partie : gestion locale
des campagnes et ressources, Player Display, chapitres et scènes, Journal riche, bestiaire, combat
léger, historique récent et tables aléatoires.

La finalisation du périmètre chapitres-scènes impose un chapitre unique à chaque scène, permet la
création, le déplacement confirmé et le réordonnancement depuis le chapitre, supprime les scènes en
cascade avec leur chapitre et rend les scènes disponibles dans les mentions `@`.

### V1.1 — En cours

La V1.1 ne cherche pas à élargir le gestionnaire de campagne. Elle doit fiabiliser la V1 pour les
sessions réelles et produire une version Windows sauvegardable, restaurable et installable. Son
périmètre correspond au jalon 14. Les validations sur une autre machine et sur deux moniteurs
identiques restent ouvertes ; le jalon 12 a été terminé sans les bloquer.

Première tranche livrée : la Régie écoute désormais la destruction native du Player Display. Une
fermeture directe par Windows remet immédiatement l'interface à l'état fermé et une nouvelle
ouverture réinstalle le suivi. Le comportement est couvert automatiquement et validé dans Tauri
avec deux écrans physiques.

Deuxième tranche livrée côté code : pendant une campagne, le moniteur réellement utilisé est
surveillé toutes les deux secondes tant que le Player Display est ouvert. Sa disparition ou une
correspondance devenue ambiguë ferme la fenêtre sans la déplacer ni la rouvrir automatiquement. Le
MJ reçoit un toast fermable, affiché huit secondes puis évacué vers la droite. Un changement de
coordonnées est accepté lorsque le fingerprint du moniteur reste unique.

Troisième tranche livrée côté code : la Configuration crée une archive ZIP portable de l’ensemble
des données locales. Un snapshot SQLite cohérent est produit avant d’archiver la base, les campagnes
et les univers. L’application conserve aussi dix archives automatiques tournantes et vérifie toutes
les trente minutes si les données ont changé. Une fermeture normale propose de sauvegarder lorsque
l’état courant n’est pas couvert. Au démarrage, un contrôle SQLite propose la dernière archive valide
si la base est illisible, sans restauration silencieuse. La restauration redémarre automatiquement,
remplace les données avant leur ouverture et journalise assez d’état pour reprendre une installation
ou un retour arrière interrompu. Les allers-retours natifs avec une archive réelle sont validés sur
le dossier courant puis depuis un dossier de données vierge.

Quatrième tranche livrée côté code : les erreurs Angular inattendues sont captées globalement,
présentées au MJ avec un message neutre et consignées dans un journal technique local. Les chemins
absolus sont masqués, les fichiers tournent à 5 Mo et sont supprimés après sept jours. La
Configuration ouvre directement leur dossier. Un contrôle léger vérifie au démarrage puis à la
demande toutes les images et vidéos référencées par SQLite, y compris les personnalisations de
campagne. Les fichiers absents ou inaccessibles sont listés par ressource et peuvent être remplacés
au même chemin, sans suppression automatique de la référence. L'ouverture du dossier des journaux,
le contrôle natif et le remplacement d'un fichier sont validés. Le contrôle dispose explicitement de
la permission Tauri de lire les métadonnées afin d'éviter les faux positifs « inaccessible ».

Cinquième tranche de validation livrée : un scénario automatisé accélère quatre heures de session
en maintenant la surveillance du Player Display toutes les deux secondes et la sauvegarde
automatique toutes les trente minutes. Il couvre 7 200 contrôles avec changements répétés de
coordonnées et huit sauvegardes sans fermeture ni erreur.

## Statut consolidé

| Jalon                       | Statut                               | État réel                                                                                                                                                                                                                                                                 |
| --------------------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0 — Environnement           | Terminé                              | Node 24 épinglé avec Volta, Angular 22, Rust stable MSVC, Build Tools et WebView2 validés.                                                                                                                                                                                |
| 1 — Shell Angular + Tauri   | Terminé                              | Application standalone zoneless, routes Angular, fenêtre principale maximisée et capabilities Tauri en place.                                                                                                                                                             |
| 2 — Multi-écran             | Validé sur le matériel courant       | Détection, plein écran, fermeture, réouverture, perte, reconnexion, changement de coordonnées et facteurs d'échelle distincts sont validés avec deux écrans. Une paire de moniteurs identiques reste à tester.                                                            |
| 3 — Régie verticale         | Terminé                              | Écran noir, lieux, PNJ et objets peuvent être envoyés au Player Display ; synchronisation `ready` et fallback statique des PNJ en place.                                                                                                                                  |
| 4 — SQLite                  | Terminé pour les tranches livrées    | Vingt migrations couvrent notamment systèmes, univers, campagnes, propriété des ressources, combat, historique récent, tables aléatoires et classement des scènes par chapitre. Repositories Tauri et mémoire isolés derrière des interfaces.                             |
| 5 — Gestion de campagne     | Terminé et étendu                    | CRUD campagnes, lieux hiérarchiques, PNJ structurés, PJ orientés MJ et objets narratifs. Navigation campagne persistante et protection des modifications non enregistrées.                                                                                                |
| 6 — Médias locaux           | Durcissement V1.1 validé dans Tauri  | Import/copie locale des portraits PNJ/PJ, images de lieux, objets et monstres, vidéo idle PNJ et nettoyage des médias. Le diagnostic natif et le remplacement au même chemin sont validés sans faux positif.                                                              |
| 7 — Tiptap et journal       | Terminé pour l’usage actuel          | Chapitres et descriptions riches, notes journalisées éditables, regroupement quotidien, mentions `@` cliquables vers les ressources de campagne et fallback texte si la cible disparaît.                                                                                  |
| 8 — Scènes                  | V1 terminée                          | Composition facultative avec lieu + PNJ + monstres + objets, activation du Player Display, appartenance obligatoire à un chapitre, ordre manuel, gestion depuis le chapitre et mentions `@` sont livrés.                                                                  |
| 9 — Bestiaire               | Terminé et catalogue global finalisé | Les catalogues canoniques PNJ, PJ, lieux, objets et monstres disposent d’éditeurs détaillés par univers. Le bestiaire conserve sa sélection par campagne, sa fiche D&D complète, ses scènes, notes et mentions `@`.                                                       |
| 10 — Combat léger           | Terminé                              | Un combat actif persistant par campagne, panneau MJ superposé, ajout PJ/PNJ/monstres, initiative manuelle triée et suivi rapide des PV.                                                                                                                                   |
| 11 — Historique récent      | Terminé                              | Huit pills persistées et cliquables par campagne, dédupliquées par récence et purgées lorsque leur cible disparaît.                                                                                                                                                       |
| 12 — Carte heuristique      | Terminé                              | Graphe interactif progressif dans Carte et Chapitres, dérivé des chapitres, scènes, ressources liées et mentions `@`, avec navigation et fallback des cibles supprimées.                                                                                                |
| 13 — Tables aléatoires      | Terminé                              | CRUD atomique de tables privées au MJ, plages de 1 à 100 triées automatiquement, validation de couverture continue et tirage uniforme sans historique.                                                                                                                    |
| 14 — Durcissement/livraison | V1.1 en cours                        | Les flux natifs principaux, la restauration depuis des données vierges, quatre heures de session accélérée, la rotation réelle des journaux et la génération de l'installeur NSIS sont validés. Restent les moniteurs identiques et l'installation sur une autre machine. |

### Tranches supplémentaires déjà livrées

- écran d’accueil et CRUD complet des campagnes ;
- fiches PNJ D&D 5e structurées, tags, capacités/actions riches et description officielle ;
- fiches PJ ciblées MJ avec portrait, statistiques utiles, validations explicites et suivi persistant des PV ;
- arborescence et réordonnancement manuel des chapitres ;
- journal global chronologique et notes liées aux ressources ;
- objets narratifs avec type et rareté configurables par univers, statut, harmonisation, détenteur unique, image et notes ;
- panneau Configuration avec navigation latérale et accordéons ;
- composants UI partagés pour boutons, dialogues, titres, états vides, champs Reactive Forms, tags et pills ;
- navigation Retour commune aux écrans d’une campagne.
- configuration globale des systèmes et univers avec corbeille, restauration et purge ;
- ressources partagées par univers et associations explicites aux campagnes.
- création locale, import, promotion, personnalisation figée et réinitialisation depuis
  l’univers pour les PNJ, PJ, lieux, objets narratifs et monstres ;
- catalogue global complet des ressources canoniques par univers, avec création, édition détaillée,
  médias, usage par les campagnes, corbeille et restauration ;
- types et raretés d’objets administrables au niveau de l’univers et partagés par ses campagnes.
- combat actif privé au MJ, persistant et accessible depuis toute page de campagne sans perdre le contexte courant.
- historique des huit dernières ressources consultées, persistant par campagne et accessible sous la navigation.
- tables aléatoires privées au MJ avec brouillons incomplets, plages continues et tirage local.

### Prochaine version

La V1 est terminée. L'ordre de livraison de la V1.1 est :

1. récupération fiable du Player Display et des changements de moniteur ;
2. sauvegarde et restauration complètes de l’application ;
3. gestion des erreurs, journal technique et contrôle des médias ;
4. validations matérielles et session longue ;
5. paquet Windows et documentation de livraison.

Le jalon 12 — carte heuristique — est terminé pendant que les deux validations matérielles de la
V1.1 restent ouvertes. Les extensions du combat, des tables et des fonds animés configurables
restent hors de cette version.

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
  chapterId: string;
  position: number;
  name: string;
  locationId: string | null;
  npcIds: string[];
  itemIds: string[];
};
```

Décisions V1 confirmées :

- chaque scène appartient obligatoirement à un unique chapitre et possède un ordre manuel dans ce
  chapitre ; aucune scène ne peut être créée sans chapitre disponible ;
- le détail du chapitre permet de créer une scène, de déplacer une scène existante après
  confirmation et de réorganiser ses scènes ;
- le chapitre reste fixe dans la fiche d'une scène existante ; une création lancée depuis un
  chapitre revient à ce chapitre après l'enregistrement ;
- supprimer un chapitre supprime en cascade ses scènes et nettoie leurs notes, entrées récentes et
  éventuel état de scène active ;
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

Tranches livrées côté code :

- `monster` contient la fiche canonique de l’univers et son illustration ;
- `campaign_monster` sélectionne explicitement les monstres utilisés par une campagne ;
- `scene_monster` relie une scène à ces mêmes fiches, sans clone ni état de combat ;
- l’espace Bestiaire permet de créer/modifier une fiche et d’ajouter ou retirer une fiche du
  catalogue de campagne ;
- la fiche reprend les données structurées utiles d’un bloc de statistiques D&D et conserve son
  JSON versionné.

Évolution du partage campagne/univers : une nouvelle fiche créée depuis une campagne reste locale.
Une action explicite permet de l’enregistrer dans l’univers sans changer son identifiant. Une fiche
importée reste canonique ; sa modification depuis une campagne crée un snapshot local complet,
figé, qui peut être supprimé avec l’action **Réinitialiser depuis l’univers**. Les notes et futurs
états de combat ne font jamais partie du snapshot canonique.

Les notes journalisées sont affichées sous la fiche, apparaissent dans le Journal global et
ouvrent directement le monstre ciblé. Les monstres sont également proposés et navigables dans les
mentions `@`, avec le même fallback texte qu’une autre ressource supprimée.

Les cinq blocs répétables (`capacités`, `actions`, `actions bonus`, `réactions` et `actions
légendaires`) sont éditables en texte riche et affichés dans la fiche détaillée. Leur éditeur et leur
rendu sont partagés avec les PNJ afin de conserver le même comportement sans dupliquer les pages.
Les actions de repaire, mécaniques mythiques et autres blocs spécialisés restent différés après la
V1.

Évolution des référentiels de règles à intégrer avant le suivi de combat :

- les alignements et tailles sont des valeurs natives, immuables, définies par le système de jeu ;
- les types de créatures et les langues combinent des valeurs natives du système et des valeurs
  propres à l’univers ;
- les sous-espèces sont rattachées à un type de créature et peuvent également être enrichies au
  niveau de l’univers ;
- le modèle de référentiel reste extensible afin d’accueillir plus tard d’autres catégories de
  règles sans multiplier les tables spécialisées ;
- la première version permet uniquement d’ajouter des valeurs au niveau de l’univers : aucune
  suppression n’est exposée dans l’interface ;
- la suppression sécurisée des valeurs personnalisées, avec contrôle des fiches qui les utilisent,
  est reportée à une version ultérieure.

### Jalon 10 — Suivi de combat léger

Objectif livré : fournir au MJ un accès **Combat** avec un panneau superposé
permettant de suivre rapidement les points de vie pendant une rencontre, sans
remplacer la gestion de combat de Foundry ni implémenter les règles complètes de
D&D.

Périmètre livré :

- un seul combat actif par campagne, persisté dans SQLite et créé automatiquement au premier ajout ;
- panneau intégré superposé, privé au MJ, ouvert ou replié depuis la navigation supérieure ;
- ajout direct depuis le panneau, les listes et les fiches PJ, PNJ et monstres ;
- une occurrence maximum par PJ ou PNJ, mais plusieurs instances nommées d'un même monstre ;
- initiative manuelle, initialisée à zéro et triée par ordre décroissant ;
- à initiative égale, priorité PJ, PNJ, monstre, puis ordre d'ajout ;
- correction directe des PV actuels et maximum, plus actions rapides de dégâts et soins ;
- PV bornés entre zéro et le maximum selon les règles D&D : « Hors combat » pour un PJ/PNJ à zéro,
  « Mort » pour un monstre à zéro, sans retrait automatique de la liste ;
- PV des PJ synchronisés immédiatement avec leur état de campagne ; PV des PNJ et monstres isolés
  dans l'instance de combat ;
- confirmation avant de retirer un combattant ou de terminer définitivement le combat.

Décisions différées : PV temporaires, états et sauvegardes de mort, lancer automatique de
l'initiative, historique des rencontres et contenu visible sur le Player Display.

### Jalon 11 — Historique récent

Objectif livré : retrouver rapidement les dernières ressources consultées pendant une partie.

Périmètre livré :

- afficher sous la barre de navigation des pills cliquables pour les dernières ressources consultées ;
- couvrir PNJ, PJ, lieux, chapitres, objets, scènes et monstres ;
- dédupliquer une ressource revisitée et la replacer en tête ;
- conserver au maximum huit entrées persistées dans SQLite et isolées par campagne ;
- enregistrer une consultation dès que la fiche est effectivement affichée, quel que soit son point d'entrée ;
- afficher le type abrégé et le nom actuel de chaque ressource ;
- masquer entièrement la rangée lorsqu'elle est vide ;
- purger automatiquement une cible supprimée ou retirée de la campagne ;
- ne proposer aucune suppression manuelle dans cette première version.

### Jalon 12 — Carte heuristique automatique

Objectif : fournir une vue navigable de la structure d’une campagne sans entretenir un second modèle manuel.

La carte est générée depuis l’arborescence des chapitres, leurs relations explicites et les mentions `@`. Les nœuds ouvrent les ressources correspondantes. Une cible supprimée reste lisible sous forme de texte et ne casse pas le graphe.

Livré :

- modèle de lecture dérivé des campagnes, chapitres et scènes existants, sans repository ni
  migration supplémentaire ;
- page **Carte** dédiée dans la navigation de campagne ;
- aperçu compact dans **Chapitres**, avec accès à la page complète ;
- graphe à placement automatique par forces, avec déplacement des nœuds, panoramique, zoom et
  ajustement à la zone visible ;
- affichage initial limité à la campagne et aux chapitres, puis ouverture ou fermeture progressive
  des scènes et ressources par simple clic ;
- plusieurs branches de chapitres ouvertes simultanément, sans superposition volontaire des nœuds ;
- campagne racine non navigable et double-clic sur un chapitre, une scène ou une ressource pour
  ouvrir sa fiche ;
- ordre des chapitres et des scènes conservé, données étrangères ou orphelines ignorées ;
- lieux, PNJ, monstres et objets explicitement associés affichés sous leur scène et navigables ;
- mentions `@` du contenu riche affichées comme branche directe de leur chapitre ;
- mentions dédupliquées, navigables lorsqu'elles sont résolues et conservées sous forme de libellés
  non cliquables lorsque leur cible a été supprimée ;
- remise à zéro des branches ouvertes au prochain chargement de la carte ;
- rendu responsive et tests ciblés de la projection visible, du service, des interactions et des
  deux points d'entrée.

### Jalon 13 — Tables aléatoires

Objectif : permettre au MJ de préparer et utiliser des tables aléatoires propres à une campagne.

Livré :

- page dédiée **Tables** dans la campagne, avec liste, recherche, lecture, création, modification et
  suppression confirmée ;
- nom obligatoire, description facultative et résultats textuels uniquement ;
- chaque résultat porte une valeur ou une plage inclusive `De / À`, bornée de 1 à 100 ;
- réordonnancement automatique par borne basse puis haute ;
- sauvegarde atomique de l'agrégat complet, y compris vide ou incomplet ;
- tirage uniforme de 1 à la borne maximale uniquement lorsque toutes les valeurs sont couvertes
  sans trou ni chevauchement ;
- dernier résultat visible dans la page jusqu'au prochain changement de table.

Les appels imbriqués, l'historique des tirages, les liens vers les ressources, le Journal et le
Player Display restent hors de cette tranche.

### Jalon 14 — V1.1, durcissement et livraison Windows

Objectif : rendre l'application fiable pendant une session réelle.

Première tranche livrée :

- écouter la destruction native du Player Display depuis la Régie ;
- remettre l'état d'ouverture et le moniteur courant à zéro après une fermeture Windows ;
- permettre la réouverture immédiate sur le moniteur préféré sans recharger la page ;
- surveiller le moniteur utilisé tant que la fenêtre est ouverte ;
- fermer sans repli ni réouverture automatique si le moniteur disparaît ou devient ambigu ;
- afficher au MJ un toast fermable pendant huit secondes, avec une sortie vers la droite ;
- accepter le changement de coordonnées d'un moniteur reconnu sans ambiguïté ;
- couvrir fermeture, réouverture, perte et déplacement logique par des tests Angular ciblés.
- créer une archive ZIP portable contenant le snapshot SQLite, `campaigns/` et `universes/` ;
- valider les chemins et le format avant d’extraire une restauration dans une zone temporaire ;
- redémarrer automatiquement et remplacer les données avant leur ouverture par SQLite ;
- restaurer les données précédentes si le remplacement échoue et notifier le MJ au lancement ;
- suivre sauvegarde et restauration dans une modale de progression non fermable pendant l’opération.
- conserver dix archives automatiques et en créer au plus une toutes les trente minutes si les
  données ont changé ;
- proposer à la fermeture de couvrir les changements postérieurs à la dernière archive ;
- contrôler SQLite au démarrage et proposer une archive valide sans jamais la restaurer
  silencieusement ;
- reprendre ou annuler sans mélange une restauration interrompue pendant le remplacement.
- conserver les journaux techniques sept jours avec rotation à 5 Mo et chemins absolus masqués ;
- capter les erreurs Angular inattendues et journaliser aussi les échecs natifs de sauvegarde et
  de surveillance du Player Display ;
- vérifier sans décodage tous les médias référencés au démarrage et depuis Configuration ;
- lister les fichiers absents ou inaccessibles par ressource et les remplacer sans changer leur
  référence SQLite.

Validations manuelles des 23 et 24 août 2026 :

- ouverture plein écran sur le moniteur narratif, fermeture Windows et réouverture avec le dernier
  visuel validées ;
- rechargement interne du Player Display avec reprise du visuel validé ;
- déconnexion et reconnexion du moniteur, toast MJ, fermeture sans repli et réouverture validés ;
- changement de coordonnées Windows, coordonnées négatives et facteurs d'échelle 100 % / 125 %
  validés sur un laptop 1920 × 1200 et un écran externe 3440 × 1440 ;
- rafraîchissement automatique de la topologie avant ouverture validé après déplacement logique des
  écrans ;
- création d'une archive réelle, restauration, redémarrage automatique et retour à l'état sauvegardé
  validés sur le dossier de données courant ;
- restauration de la même archive depuis un dossier de données vierge, recréation de la base et des
  médias, redémarrage et diagnostic final sans erreur validés ;
- ouverture du dossier des journaux et contrôle des médias validés dans l'application native ;
- remplacement d'un média au même chemin validé après correction de la permission `fs:allow-stat` ;
- absence réelle d'un média détectée après déplacement contrôlé, puis retour à un diagnostic sain
  après remise en place du fichier validé ;
- quatre heures virtuelles avec 7 200 contrôles du moniteur déplacé et huit sauvegardes automatiques
  validées sans fermeture, toast ni erreur technique.
- rotation réelle validée après dépassement contrôlé de 5 000 000 octets : archivage du journal
  existant et création d'un nouveau journal actif, puis retrait des données artificielles ;
- génération de l'installeur NSIS validée le 24 août 2026 par GitHub Actions après les tests Angular
  et la compilation Rust release ; l'artefact est conservé quatorze jours.
- guide d'installation, de sauvegarde et de dépannage actualisé pour la version distribuée, y
  compris les limites de l'installateur non signé.

Restent à valider : deux moniteurs matériellement identiques et installation du paquet Windows sur
une autre machine.

Travail restant :

- valider le remplacement entre deux moniteurs matériellement identiques ;
- installer et exécuter le paquet NSIS sur une machine Windows cible ;

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
| Journal technique         | Plugin Log Tauri                        |          14.3 | Retenue                                |
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
Jalon 12       -> carte heuristique automatique terminée
Jalon 13       -> tables aléatoires, fin de la V1 fonctionnelle
Jalon 14       -> V1.1, durcissement et version Windows distribuable
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
