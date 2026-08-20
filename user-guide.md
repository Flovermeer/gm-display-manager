# Guide d'utilisation — Beholder's Inn

Ce guide décrit l'application locale Angular + Tauri, ses catalogues d'univers,
ses campagnes et sa régie narrative multi-écran.

## 1. Lancer l'application

Depuis la racine du projet :

```powershell
npm.cmd run tauri dev
```

Au premier lancement, Cargo peut compiler de nombreuses dépendances Rust. Les
lancements suivants réutilisent le cache de compilation et sont normalement
plus rapides.

La fenêtre principale **Beholder's Inn** s'ouvre maximisée sur l'accueil des
campagnes. Elle conserve sa barre de titre et les contrôles Windows : tu peux la
réduire ou utiliser `Alt+Tab` pour gérer Foundry à côté.

## 2. Ouvrir ou créer une campagne

L'accueil présente les campagnes existantes à gauche et le formulaire de
création à droite.

- Clique sur une carte pour ouvrir immédiatement la campagne.
- Pour créer une campagne, renseigne au minimum son nom puis clique sur **Créer
  la campagne**. La nouvelle campagne s'ouvre automatiquement.
- **Modifier** charge la campagne dans le formulaire de droite sans l'ouvrir.
  Enregistre les changements ou utilise **Annuler** pour revenir au formulaire
  de création.
- **Supprimer** ouvre une confirmation explicite. La validation supprime aussi
  les PNJ, les lieux et les médias importés de cette campagne ; cette action est
  définitive.
- La dernière campagne ouverte est mise en évidence, mais l'application revient
  toujours à l'accueil après un redémarrage.

La prévisualisation lancée avec Angular seul conserve les campagnes uniquement
en mémoire. Dans Tauri, elles sont enregistrées dans SQLite et survivent au
redémarrage.

Une fois dans une campagne, la barre supérieure reste visible pendant le
défilement :

- **Régie** ouvre le panneau MJ ;
- **Lieux** ouvre la bibliothèque hiérarchique des décors et régions ;
- **PNJ** ouvre la bibliothèque des personnages non joueurs ;
- **Écrans** ouvre la régie à hauteur de la configuration du moniteur narratif ;
- **Accueil** revient à la liste des campagnes.

Les rubriques grisées indiquent les prochaines sections prévues.

### Gérer les lieux

La page **Lieux** présente l'arborescence de la campagne dans le panneau gauche.
Un lieu peut rester à la racine ou être rangé dans un autre lieu, par exemple
`Chult › Port Nyanzaru › Beholder's Inn`. La recherche porte aussi sur ce chemin,
ce qui permet de distinguer facilement deux lieux portant le même nom.

La fiche permet de modifier le nom, le lieu parent, le résumé et les notes. Elle
accepte une illustration PNG, JPG, JPEG ou WebP, copiée dans le dossier interne
de la campagne. Comme pour les PNJ, un brouillon importé est supprimé si tu
annules la modification.

En lecture seule, **Afficher aux joueurs** envoie l'illustration au Player
Display. L'image de démonstration de l'auberge, marquée **Démo**, est utilisée si
aucune illustration n'est encore enregistrée. Supprimer un lieu replace ses
enfants à la racine de la campagne au lieu de les supprimer.

### Gérer les PNJ

La page **PNJ** propose une liste filtrable à gauche et la fiche sélectionnée à
droite. La flèche replie ou affiche le panneau latéral.

Une fiche est toujours ouverte en lecture seule. Utilise **Modifier** pour
changer son nom, son statut, son rôle ou ses notes, puis **Enregistrer**. La
suppression demande une confirmation séparée.

En mode édition, clique sur le cadre carré du portrait pour choisir une image
PNG, JPG, JPEG ou WebP. L'original reste intact : une copie est enregistrée dans
le dossier interne de la campagne. Elle n'est attachée au PNJ qu'après
validation de la fiche et elle est supprimée si tu annules. Le cadre carré
utilise un recadrage visuel sans modifier le fichier.

En lecture seule, **Afficher aux joueurs** envoie ce portrait statique au Player
Display. Tant qu'aucun portrait n'est enregistré, l'illustration de démonstration
de Mira Vell est utilisée et marquée **Démo**. Le bouton reste désactivé si la
fenêtre joueurs n'est pas ouverte. Le portrait enregistré deviendra
automatiquement le fallback lorsqu'un média animé est ajouté.

Le champ **Animation pour l'écran joueurs** accepte une vidéo WebM ou MP4. Elle
est copiée dans la campagne comme les images, puis lue en boucle, muette et sans
contrôles sur le Player Display. La fiche MJ conserve le portrait statique. Si la
vidéo est absente ou illisible, l'écran joueurs revient automatiquement à ce
portrait sans interrompre la régie.

Si tu tentes de changer de fiche ou de page avec un brouillon, l'application
propose trois choix : **Enregistrer et quitter**, **Quitter sans enregistrer** ou
**Continuer la modification**.

## 3. Gérer les ressources d'un univers

Depuis l'accueil, ouvre **Configuration**, sélectionne un système et un univers,
puis choisis **Ressources de l'univers**. Les onglets PNJ, PJ, Lieux, Objets et
Bestiaire présentent les fiches canoniques partagées par toutes les campagnes de
cet univers.

- **Ajouter** crée directement une fiche canonique sans l'associer à une campagne.
- **Modifier** ouvre l'éditeur détaillé et ses médias stockés dans le dossier de
  l'univers.
- Pour les objets, les types et raretés sont administrés au-dessus du catalogue.
  Une valeur utilisée par une fiche ne peut pas être supprimée.
- **Corbeille** empêche les nouveaux imports dans les campagnes sans casser les
  campagnes qui utilisent déjà la fiche. **Restaurer** la rend de nouveau disponible.

Les statuts, propriétaires, noms de joueurs, PV courants et notes de campagne ne
figurent pas dans ces éditeurs : ils restent propres à chaque campagne. Quitter
une fiche modifiée déclenche une confirmation avant d'abandonner le brouillon.

## 4. Suivre un combat

Le bouton **Combat** de la barre supérieure ouvre un panneau privé au MJ au-dessus de la page
courante. Le panneau peut être replié puis rouvert sans perdre la rencontre.

- Ajoute un PJ, PNJ ou monstre depuis le sélecteur du panneau, depuis sa ligne dans la liste
  latérale ou depuis sa fiche.
- Le premier ajout crée automatiquement le combat. Un PJ ou PNJ déjà présent ne peut pas être
  ajouté deux fois ; les monstres acceptent plusieurs instances numérotées et renommables.
- Renseigne l'initiative manuellement. La liste est triée par initiative décroissante, puis PJ,
  PNJ et monstres en cas d'égalité.
- Corrige directement les PV actuels ou maximum, ou saisis une quantité puis utilise **Dégâts** ou
  **Soins**. Les PV restent entre zéro et le maximum.
- Un PJ ou PNJ à zéro reste marqué **Hors combat**. Un monstre à zéro reste marqué **Mort**.
- Retirer un combattant demande confirmation. **Terminer** supprime définitivement la rencontre
  active après confirmation.

Le combat est enregistré dans SQLite et survit à un redémarrage de l'application. Les PV des PJ
restent synchronisés avec leur fiche de campagne. Le combat n'est jamais envoyé au Player Display.

## 5. Revenir aux ressources récentes

Lorsqu'une fiche PJ, PNJ, monstre, lieu, chapitre, objet ou scène est affichée, elle rejoint la rangée
**Récents** sous la navigation de campagne. Chaque pill indique son type et son nom ; clique dessus
pour rouvrir directement la fiche.

La liste conserve automatiquement les huit dernières ressources, sans doublon, de la plus récente à
la plus ancienne. Elle est propre à chaque campagne, enregistrée dans SQLite et masquée lorsqu'elle
est vide. Une ressource supprimée ou retirée de la campagne disparaît également de cette liste.

## 6. Utiliser les tables aléatoires

Ouvre **Tables** dans la navigation de la campagne. Une table possède un nom obligatoire, une
description facultative et autant de résultats textuels que nécessaire.

Pour chaque résultat, saisis une borne **De** et une borne **À** entre 1 et 100. Utilise la même
borne pour une valeur unique. Les lignes se réordonnent automatiquement par borne basse. Une table
vide ou incomplète peut être enregistrée afin de reprendre sa préparation plus tard.

Le bouton **Tirer** devient disponible lorsque les plages couvrent tous les entiers depuis 1 jusqu'à
la borne maximale, sans trou ni chevauchement, et que chaque résultat contient un texte. Le tirage
et son dernier résultat restent privés dans le panneau MJ. Ils ne sont ni journalisés, ni envoyés à
l'écran joueurs.

La suppression d'une table demande confirmation et supprime définitivement toutes ses entrées.

## 7. Choisir l'écran des joueurs

Dans la section **Écran joueurs** :

1. vérifie la liste des moniteurs détectés ;
2. repère le moniteur marqué `principal` afin d'éviter de masquer le panneau MJ ;
3. sélectionne le moniteur destiné aux joueurs ;
4. vérifie si nécessaire sa résolution, sa position et son facteur d'échelle.

Le bouton **Actualiser** relit la configuration des écrans connectés. Utilise-le
après avoir branché, débranché ou réorganisé un moniteur dans Windows.

Le moniteur utilisé avec succès est mémorisé dans la base SQLite locale. Au
prochain lancement, il est automatiquement présélectionné s'il peut être reconnu
sans ambiguïté. Si deux moniteurs identiques partagent la même empreinte,
l'application demande une nouvelle sélection au lieu de choisir arbitrairement.

## 8. Ouvrir l'écran joueurs

Après avoir sélectionné un moniteur, clique sur **Ouvrir l'écran joueurs**.

L'application crée une seconde fenêtre Tauri qui :

- charge la route `/player-display` ;
- est positionnée sur le moniteur choisi ;
- passe en plein écran ;
- ne contient aucun contrôle destiné au MJ.

La fenêtre principale reste ouverte sur le panneau du maître de jeu.

## 9. Piloter le contenu affiché

La section **Contenu affiché** fournit actuellement trois actions de
démonstration :

- **Lieu — Beholder's Inn** affiche une illustration locale de l'auberge ;
- **PNJ — Mira Vell** superpose un portrait local au décor de l'auberge ;
- **Écran noir** masque immédiatement le contenu destiné aux joueurs.

Le contenu courant est indiqué en haut à droite de la section. Les médias de
démonstration sont inclus dans le projet et fonctionnent hors ligne.

Tu peux choisir un contenu avant d'ouvrir la fenêtre joueurs : l'état complet
sera envoyé automatiquement lorsque cette fenêtre annoncera qu'elle est prête.

## 10. Déplacer l'écran joueurs

Lorsque la fenêtre joueurs existe déjà, le bouton devient **Déplacer l'écran
joueurs**.

Pour la déplacer :

1. sélectionne un autre moniteur dans la liste ;
2. clique sur **Déplacer l'écran joueurs**.

La fenêtre quitte brièvement le plein écran, change de position, puis repasse en
plein écran sur le moniteur choisi.

### Comportement provisoire

Lorsque le moniteur sélectionné héberge déjà la fenêtre joueurs, le bouton
indique **Déjà affiché sur cet écran** et reste désactivé. Cela évite de
réappliquer inutilement le plein écran et de provoquer un flicker.

## 11. Fermer l'écran joueurs

Clique sur **Fermer l'écran joueurs** depuis le panneau MJ. La fenêtre dédiée
est fermée sans fermer l'application principale.

Si la fenêtre a été fermée directement depuis Windows, clique sur **Actualiser**
pour synchroniser l'état affiché dans le panneau MJ.

## 12. Prévisualisation dans le navigateur

Angular peut être lancé sans Tauri :

```powershell
npm.cmd start
```

Dans ce mode, les API natives et la gestion multi-écran ne sont pas disponibles.
Les actions de contenu modifient tout de même l'état de prévisualisation local.
Le lien de prévisualisation ouvre la route `/player-display` dans la même page et
affiche un bouton **Retour au panneau MJ**.

## 13. Arrêter l'application de développement

Ferme les fenêtres puis, dans le terminal qui exécute Tauri, utilise :

```text
Ctrl + C
```

## 14. Limites actuelles

- l'état de la fenêtre n'est pas encore synchronisé en temps réel si elle est
  fermée directement par Windows ;
- les contenus sont encore des médias de démonstration et ne proviennent pas
  d'une campagne persistée ;
- les documents ne sont pas encore proposés dans le panneau MJ ;
- la reconnexion automatique après le retrait d'un moniteur reste à implémenter ;
- la validation multi-écran est pour l'instant manuelle et ciblée sur Windows.

## 15. Dépannage rapide

### Aucun moniteur détecté

Vérifie les paramètres d'affichage Windows, puis clique sur **Actualiser**.

### La fenêtre ne s'ouvre pas

Redémarre complètement le processus Tauri pour recharger les capabilities :

```powershell
npm.cmd run tauri dev
```

Si une erreur apparaît dans l'interface ou dans le terminal, conserve son texte
exact pour le diagnostic.

### La fenêtre s'ouvre sur le mauvais écran

Sélectionne explicitement un autre moniteur puis utilise **Déplacer l'écran
joueurs**. Les coordonnées affichées peuvent être négatives lorsque le moniteur
est placé à gauche ou au-dessus de l'écran principal ; ce comportement est
normal sous Windows.
