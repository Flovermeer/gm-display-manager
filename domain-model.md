# Modèle métier cible

Date de décision : 12 août 2026

Ce document fixe les décisions de modélisation prises pour le gestionnaire de campagne. Le schéma sera livré par petites migrations au fil des tranches verticales ; toutes les entités décrites ici ne sont donc pas nécessairement déjà présentes dans SQLite.

## Principes

- Les identifiants sont des UUID générés en TypeScript et stockés en `TEXT` dans SQLite.
- Toutes les entités propres à une campagne portent une clé étrangère `campaign_id`.
- Les données recherchées, filtrées ou reliées restent dans des colonnes et tables relationnelles.
- Les données dépendantes d'un système de jeu restent dans du JSON versionné.
- Les médias volumineux restent dans le filesystem ; SQLite ne conserve que leurs métadonnées et chemins internes.
- Les suppressions d'une campagne suppriment en cascade ses données métier et
  son dossier de médias après confirmation explicite dans l'interface.

## Campagne

Une campagne contient au minimum :

- `id` ;
- `name` ;
- `description` ;
- `system_key`, avec `dnd5e` comme valeur initiale par défaut ;
- `created_at` et `updated_at`.

La campagne active est une préférence applicative stockée dans `app_setting`, et
non un attribut de la campagne. Cette préférence est effacée si elle désigne une
campagne supprimée.

## Personnages

### Personnage joueur

`player_character` représente un personnage, pas la personne humaine qui joue :

- `name` désigne le personnage ;
- `player_name` désigne la personne qui le joue ;
- `status` accepte initialement `active`, `dead`, `retired` ou `missing` ;
- `sheet_json` contient les données propres au système de jeu ;
- `sheet_schema_version` permet de migrer ce JSON.

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

`npc` suit les mêmes principes, sans `player_name`. Sa fiche système reste également dans un JSON versionné.

Chaque PNJ peut référencer un `portrait_path` statique et un
`idle_video_path` facultatif, tous deux relatifs au dossier interne de la
campagne. La fiche MJ reste statique. Sur le Player Display, la vidéo WebM ou MP4
est lue en boucle, muette et sans contrôles ; le portrait reste affiché derrière
et reprend automatiquement la place si la vidéo échoue.

## Lieux

Un `location` appartient à une campagne. Un `parent_location_id` nullable permet une hiérarchie telle que :

```text
Chult
└── Port Nyanzaru
    └── Beholder's Inn
```

La hiérarchie reste facultative : un lieu peut être créé directement à la racine d'une campagne.
Un lieu contient également un résumé, des notes simples et un `image_path` relatif
vers son illustration dans le dossier interne de la campagne. L'illustration est
utilisée dans la fiche MJ et sur le Player Display ; le visuel de démonstration de
l'auberge sert de fallback tant qu'aucune image n'est enregistrée.

Un lieu ne peut pas devenir son propre parent ni être placé dans un de ses
descendants. Lorsqu'un lieu est supprimé, ses enfants directs sont replacés à la
racine de la campagne afin d'éviter une suppression implicite de toute une branche.

## Objets narratifs

`item` constitue un catalogue des objets remarquables liés à l'histoire : artefacts, clés, documents, objets de quête ou récompenses uniques.

Le catalogue n'a pas vocation à recopier tous les objets génériques d'un système comme D&D. Les possessions génériques pourront rester dans les fiches JSON ou en texte libre. Le suivi des propriétaires et quantités sera ajouté dans une tranche dédiée lorsqu'un véritable inventaire sera implémenté.

## Chapitres et sections

Les chapitres forment une liste ordonnée et réorganisable dans la campagne. Un chapitre contient des `chapter_section` également ordonnées.

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

Une entrée est soit globale à la campagne, soit rattachée à exactement une ressource : PNJ, lieu
ou PJ. Les notes rattachées apparaissent automatiquement dans le Journal global sous forme d'un
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
mention résolue ouvre la fiche PNJ, lieu ou PJ correspondante dans la campagne active. Si la
ressource n'existe plus, la mention reste affichée comme du texte normal et ne déclenche aucune
navigation.

Les anciens champs de note libre des fiches PNJ, lieux et PJ sont abandonnés sans migration de
leur contenu.

Ce journal remplace, dans un premier temps, tout compteur spécialisé propre à une campagne. Un compteur ne sera ajouté que si un usage concret le justifie.
