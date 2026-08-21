# Modèle métier cible

Date de décision : 14 août 2026

Ce document fixe les décisions de modélisation prises pour le gestionnaire de campagne. Le schéma sera livré par petites migrations au fil des tranches verticales ; toutes les entités décrites ici ne sont donc pas nécessairement déjà présentes dans SQLite.

## Principes

- Les identifiants sont des UUID générés en TypeScript et stockés en `TEXT` dans SQLite.
- Un système de jeu contient des univers ; un univers contient les catalogues de ressources
  partagées et les campagnes qui les utilisent.
- Les chapitres et entrées de journal appartiennent directement à une campagne. Chaque scène
  appartient obligatoirement à un unique chapitre et, par ce chapitre, à sa campagne.
- Les PJ, PNJ, lieux, objets narratifs et monstres appartiennent à un univers. Des tables
  d’association portent leur contexte propre à chaque campagne.
- Les données recherchées, filtrées ou reliées restent dans des colonnes et tables relationnelles.
- Les données dépendantes d'un système de jeu restent dans du JSON versionné.
- Les médias volumineux restent dans le filesystem ; SQLite ne conserve que leurs métadonnées et chemins internes.
- Supprimer une campagne supprime ses données propres et associations, jamais les fiches
  canoniques partagées de l’univers.
- Les systèmes et univers utilisent une corbeille via `deleted_at`. Leur purge définitive est une
  action séparée et supprime en cascade tout leur contenu.

## Systèmes de jeu et univers

`game_system` est le catalogue administrable des systèmes de jeu. `game_universe` appartient à
un seul système et constitue la frontière de partage des ressources. Les données existantes sont
migrées vers le système D&D 5e et l’univers **Forgotten Realms**.

La mise à la corbeille renseigne uniquement `deleted_at` sur le système ou l’univers racine : le
contenu reste intact et réapparaît lors de la restauration. Une purge définitive utilise les
cascades SQLite après confirmation explicite.

## Campagne

Une campagne contient au minimum :

- `id` ;
- `name` ;
- `description` ;
- `universe_id`, choisi à la création et ensuite immuable ;
- `created_at` et `updated_at`.

La campagne active est une préférence applicative stockée dans `app_setting`, et
non un attribut de la campagne. Cette préférence est effacée si elle désigne une
campagne supprimée.

Le formulaire choisit d’abord un système, puis un univers filtré sur ce système. Les premières
valeurs disponibles sont présélectionnées. Une confirmation récapitule le nom, le système et
l’univers avant la création.

## Personnages

### Personnage joueur

`player_character` représente la fiche canonique partagée dans un univers, pas la personne humaine
qui joue :

- `name` désigne le personnage ;
- `max_hit_points` et la fiche système appartiennent à la fiche canonique ;
- `sheet_json` contient les données propres au système de jeu ;
- `sheet_schema_version` permet de migrer ce JSON.

`campaign_player_character` porte le nom du joueur, le statut et les PV actuels propres à une
campagne. Un même PJ peut ainsi continuer dans une campagne suivante sans être cloné.

La fiche PJ est une référence ciblée pour le MJ, pas une reproduction complète de la fiche de
jeu. Les données fréquemment affichées et mises à jour restent relationnelles :

- `current_hit_points` et `max_hit_points` portent l'état persistant entre combats et sessions ;
- le MJ peut corriger les PV actuels ou les remettre au maximum avec confirmation ;
- le futur tracker de combat réutilisera ces mêmes valeurs pour les PJ et ne créera pas une copie
  concurrente de leur état.

Le JSON de fiche D&D 5e version 2 contient uniquement les informations utiles au MJ : espèce,
classe, niveau, classe d'armure, vitesse, perceptions passives, sens, langues, conditions,
épuisement et notes privées. Les caractéristiques, compétences, sorts, attaques et l'inventaire
générique détaillés restent hors périmètre initial.

Les sens, langues et conditions sont stockés comme des tableaux de libellés libres. L'interface les
édite sous forme de tags supprimables et convertit à la lecture les anciennes valeurs texte de la
version 1 afin de préserver les fiches déjà enregistrées.

Chaque PJ peut référencer un `portrait_path` statique relatif au dossier interne de sa campagne.
Le portrait sert à la fiche de référence du MJ ; son remplacement et la suppression du PJ nettoient
le fichier précédent.

Plusieurs personnages, y compris de même nom, peuvent appartenir à la même campagne. Une table séparée pour les joueurs humains n'est pas nécessaire au MVP.

### PNJ

`npc` contient la fiche canonique d’univers : nom, médias, description officielle et fiche système
JSON versionnée. `campaign_npc` contient le statut et le rôle/résumé propres à la campagne. Les
notes du MJ restent des entrées de journal liées à la campagne et au PNJ.

Chaque PNJ peut référencer un `portrait_path` statique et un
`idle_video_path` facultatif, tous deux relatifs au dossier interne de la
campagne. La fiche MJ reste statique. Sur le Player Display, la vidéo WebM ou MP4
est lue en boucle, muette et sans contrôles ; le portrait reste affiché derrière
et reprend automatiquement la place si la vidéo échoue.

## Lieux

Un `location` appartient à un univers. Un `parent_location_id` nullable permet une hiérarchie telle que :

```text
Chult
└── Port Nyanzaru
    └── Beholder's Inn
```

La hiérarchie reste facultative : un lieu peut être créé directement à la racine d'un univers.
Un lieu contient également un résumé, des notes simples et un `image_path` relatif
vers son illustration dans le dossier interne de la campagne. L'illustration est
utilisée dans la fiche MJ et sur le Player Display ; le visuel de démonstration de
l'auberge sert de fallback tant qu'aucune image n'est enregistrée.

Un lieu ne peut pas devenir son propre parent ni être placé dans un de ses
descendants. `campaign_location` sélectionne explicitement les lieux utilisés par une campagne.

## Objets narratifs

`narrative_item` constitue un catalogue des objets remarquables liés à l'histoire : artefacts, clés,
documents, objets de quête ou récompenses uniques. Un objet contient un nom, un résumé, une
description officielle riche et une illustration facultative.

Chaque objet référence un type obligatoire et une rareté facultative configurables par univers.
Un univers reçoit automatiquement un catalogue initial de types et raretés, que le MJ peut
ajouter, renommer ou supprimer. La suppression est refusée lorsqu'une valeur est utilisée par un
objet. L'harmonisation vaut `none`, `required` ou `conditional`; le dernier cas exige une condition
en texte libre.

`campaign_narrative_item` porte le statut et au maximum un détenteur actuel — PJ, PNJ ou lieu —
dans cette campagne. Ces relations ne constituent pas encore un inventaire quantitatif ou un
historique des possessions.

Le catalogue n'a pas vocation à recopier tous les objets génériques d'un système comme D&D. Les
possessions génériques pourront rester dans les fiches JSON ou en texte libre. Le suivi des
quantités sera ajouté dans une tranche dédiée lorsqu'un véritable inventaire sera implémenté.

## Bestiaire

`monster` est une fiche canonique du catalogue d’un univers. Elle contient son nom, son
illustration et un `sheet_json` versionné pour les statistiques propres au système de jeu. Elle ne
porte ni campagne active, ni points de vie courants, ni état de combat.

`campaign_monster` représente uniquement la sélection explicite des monstres disponibles dans une
campagne. Retirer un monstre de cette sélection ne supprime donc pas sa fiche partagée. Une autre
campagne du même univers peut sélectionner exactement la même fiche, sans clone et sans risque de
divergence entre copies.

`scene_monster` associe une scène aux fiches sélectionnées pour sa campagne. Cette relation décrit
la préparation narrative de la scène ; les futurs exemplaires rencontrés, leurs PV courants et
leurs conditions appartiendront au suivi de combat et ne modifieront pas la fiche canonique.

## Combat actif

`active_combat` porte l'unique rencontre active d'une campagne. Sa suppression termine la rencontre ;
aucun historique de combat n'est conservé dans ce jalon.

`combatant` référence un PJ, un PNJ ou un monstre sélectionné dans la campagne. Il stocke le nom
d'affichage, l'initiative manuelle et l'ordre d'ajout. Une contrainte interdit plusieurs occurrences
du même PJ ou PNJ, tandis qu'un même monstre peut produire plusieurs instances indépendantes.

Les PV suivent deux stratégies explicites :

- pour un PJ, `combatant` ne stocke aucun PV ; le tracker lit et met à jour directement
  `campaign_player_character.current_hit_points` et le maximum effectif de la fiche de campagne ;
- pour un PNJ ou un monstre, les PV actuels et maximum sont temporaires et appartiennent à
  `combatant`, sans modifier la ressource canonique ou son éventuelle personnalisation de campagne.

Les PV restent compris entre zéro et le maximum. Un combattant à zéro reste dans la liste jusqu'à
son retrait explicite ou jusqu'à la fin du combat.

## Historique récent

`recent_resource` conserve au maximum huit ressources consultées par campagne. Une entrée associe
le type de ressource, son identifiant, son nom d'affichage courant et un ordre de consultation
monotone. La clé composée `(campaign_id, resource_type, resource_id)` garantit qu'une ressource
revisitée est remontée en tête sans être dupliquée.

Les types suivis sont les PJ, PNJ, monstres, lieux, chapitres, objets narratifs et scènes. Le nom
est resynchronisé au chargement. Comme la cible est polymorphe, l'application vérifie son appartenance
à la campagne et supprime l'entrée si la ressource a été supprimée ou retirée. La suppression d'une
campagne efface son historique par cascade SQLite.

## Tables aléatoires

`random_table` appartient à une campagne et stocke son nom, sa description et l'ensemble versionné
de ses résultats dans `entries_json`. Les résultats forment un seul agrégat sans relation externe ;
une sauvegarde remplace donc atomiquement le nom, la description et toutes les entrées de la table.
La suppression d'une campagne supprime ses tables par cascade SQLite.

Chaque entrée possède un identifiant stable, une borne minimale, une borne maximale et un résultat
textuel. Les bornes peuvent rester nulles dans un brouillon enregistré. Lorsqu'elles sont définies,
elles sont entières, inclusives et comprises entre 1 et 100 ; deux bornes égales représentent une
valeur unique. Les entrées sont normalisées par borne minimale puis maximale.

Le tirage est autorisé seulement si toutes les entrées sont complètes et couvrent chaque entier de
1 à la borne maximale sans trou ni chevauchement. Il est uniforme sur cet intervalle. Les tables ne
référencent pas d'autres ressources, ne s'appellent pas entre elles et ne produisent ni historique,
ni entrée de Journal, ni commande vers le Player Display.

## Chapitres et sections

Les chapitres forment une liste ordonnée et réorganisable dans la campagne. Un chapitre contient
des `chapter_section` également ordonnées et une liste ordonnée de scènes.

Une scène référence obligatoirement son chapitre par `chapter_id` et porte une `position` manuelle
dans ce chapitre. Il n'existe pas de scène non classée ni de scène liée à plusieurs chapitres. La
création d'une scène est donc indisponible tant que la campagne ne contient aucun chapitre.

Le chapitre est le point de gestion de ce classement : le MJ peut y créer une scène, y déplacer une
scène existante après confirmation et modifier l'ordre avec les actions haut/bas. La fiche d'une
scène existante ne permet pas de changer directement son chapitre. Supprimer un chapitre supprime
en cascade ses scènes, leurs notes journalisées, leurs entrées récentes et, le cas échéant, la
référence à la scène active.

Les sections restent sur un seul niveau. Les subdivisions internes utilisent les titres du contenu riche plutôt qu'une hiérarchie SQL de sous-sections.

Chaque section peut référencer plusieurs :

- lieux ;
- PNJ ;
- objets narratifs.

Ces relations utilisent des tables de liaison explicites afin de conserver de vraies clés étrangères SQLite.

## Contenu riche et références réactives

Le contenu riche sera enregistré au format JSON Tiptap avec une version de schéma. Une référence insérée avec une interaction telle que `@Mira Vell` conserve le type et l'UUID de l'entité, pas une copie définitive de son nom.

Exemple conceptuel :

```json
{
  "type": "entityReference",
  "attrs": {
    "entityType": "npc",
    "entityId": "uuid-du-pnj"
  }
}
```

À la sauvegarde, un service applicatif synchronisera les références du document avec les tables de liaison de la section. Les tables relationnelles seront la source fiable pour les relations et empêcheront les références vers des entités supprimées.

## Graphe de chapitre

Le graphe est une projection automatique des données, et non un canevas édité séparément. Il est construit depuis :

- le chapitre et ses sections ;
- les références réactives présentes dans le texte ;
- les clés étrangères et tables de liaison ;
- la hiérarchie des lieux.

Les nœuds distinguent les sections, lieux, PNJ et objets. Un clic sur un nœud ouvre la fiche correspondante. Le graphe ne duplique aucune donnée métier.

## Journal de campagne

Les notes de partie forment un journal chronologique unifié. Une entrée contient :

- une date réelle de session ;
- une date en jeu facultative, stockée comme texte pour rester indépendante du système ;
- un titre facultatif ;
- un contenu riche ;
- un horodatage technique de création pour stabiliser l'ordre lorsque plusieurs entrées partagent
  la même date de session.

Une entrée est soit globale à la campagne, soit rattachée à exactement une ressource : PNJ,
monstre, lieu, PJ, objet narratif ou scène. Les notes rattachées apparaissent automatiquement dans le Journal global sous forme d'un
lien compact indiquant le type, le nom et un aperçu sur deux lignes. Ce lien ouvre la fiche de la
ressource directement sur l'entrée concernée.

Chaque entrée peut être modifiée ou supprimée après confirmation. L'ordre par défaut va de la
plus récente à la plus ancienne. La date réelle comprend l'heure et la minute et est préremplie
avec l'instant courant ; le titre et la date en jeu restent facultatifs, tandis que le contenu
riche est obligatoire. Une modification met à jour l'entrée existante sans créer un historique de
versions.

Dans le Journal global, les entrées restent indépendantes en persistance mais sont regroupées
visuellement par journée locale. Les journées sont affichées de la plus récente à la plus ancienne
et leurs entrées sont insérées chronologiquement selon leur timestamp. Le titre de l'accordéon est
celui de la première entrée chronologique de la journée, ou un libellé générique si cette entrée
n'a pas de titre. Une entrée globale affiche son contenu complet ; une entrée rattachée affiche un
aperçu cliquable qui redirige vers la fiche et la note ciblées.

Les mentions `@` présentes dans le contenu riche sont également interactives en lecture seule. Une
mention résolue ouvre la fiche PJ, PNJ, monstre, lieu, objet ou scène correspondante dans la campagne active. Si la
ressource n'existe plus, la mention reste affichée comme du texte normal et ne déclenche aucune
navigation.

Les anciens champs de note libre des fiches PNJ, lieux et PJ sont abandonnés sans migration de
leur contenu.

Ce journal remplace, dans un premier temps, tout compteur spécialisé propre à une campagne. Un compteur ne sera ajouté que si un usage concret le justifie.
