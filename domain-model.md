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

Plusieurs personnages, y compris de même nom, peuvent appartenir à la même campagne. Une table séparée pour les joueurs humains n'est pas nécessaire au MVP.

### PNJ

`npc` suit les mêmes principes, sans `player_name`. Sa fiche système reste également dans un JSON versionné.

Chaque PNJ peut référencer un `portrait_path` statique relatif au dossier interne de la campagne. Ce portrait sert à l'interface MJ et de fallback au Player Display. Un futur média animé restera facultatif et séparé : aucune duplication de l'image statique n'est nécessaire.

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

Les notes de partie forment un journal chronologique. Une entrée contient :

- une date réelle de session ;
- une date en jeu facultative, stockée comme texte pour rester indépendante du système ;
- un titre facultatif ;
- un contenu riche ;
- une position stable pour ordonner plusieurs entrées d'une même session.

Ce journal remplace, dans un premier temps, tout compteur spécialisé propre à une campagne. Un compteur ne sera ajouté que si un usage concret le justifie.
