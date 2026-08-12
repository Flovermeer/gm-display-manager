# Guide d'utilisation — Beholder's Inn

Ce guide décrit l'état actuel de la preuve de concept Angular + Tauri. Les
fonctionnalités de campagne, de médias et de régie narrative seront ajoutées
progressivement.

## 1. Lancer l'application

Depuis la racine du projet :

```powershell
npm.cmd run tauri dev
```

Au premier lancement, Cargo peut compiler de nombreuses dépendances Rust. Les
lancements suivants réutilisent le cache de compilation et sont normalement
plus rapides.

La fenêtre principale **Beholder's Inn** s'ouvre maximisée sur le panneau du
maître de jeu. Elle conserve sa barre de titre et les contrôles Windows : tu
peux la réduire ou utiliser `Alt+Tab` pour gérer Foundry à côté.

## 2. Choisir l'écran des joueurs

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

## 3. Ouvrir l'écran joueurs

Après avoir sélectionné un moniteur, clique sur **Ouvrir l'écran joueurs**.

L'application crée une seconde fenêtre Tauri qui :

- charge la route `/player-display` ;
- est positionnée sur le moniteur choisi ;
- passe en plein écran ;
- ne contient aucun contrôle destiné au MJ.

La fenêtre principale reste ouverte sur le panneau du maître de jeu.

## 4. Piloter le contenu affiché

La section **Contenu affiché** fournit actuellement trois actions de
démonstration :

- **Lieu — Beholder's Inn** affiche une illustration locale de l'auberge ;
- **PNJ — Mira Vell** superpose un portrait local au décor de l'auberge ;
- **Écran noir** masque immédiatement le contenu destiné aux joueurs.

Le contenu courant est indiqué en haut à droite de la section. Les médias de
démonstration sont inclus dans le projet et fonctionnent hors ligne.

Tu peux choisir un contenu avant d'ouvrir la fenêtre joueurs : l'état complet
sera envoyé automatiquement lorsque cette fenêtre annoncera qu'elle est prête.

## 5. Déplacer l'écran joueurs

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

## 6. Fermer l'écran joueurs

Clique sur **Fermer l'écran joueurs** depuis le panneau MJ. La fenêtre dédiée
est fermée sans fermer l'application principale.

Si la fenêtre a été fermée directement depuis Windows, clique sur **Actualiser**
pour synchroniser l'état affiché dans le panneau MJ.

## 7. Prévisualisation dans le navigateur

Angular peut être lancé sans Tauri :

```powershell
npm.cmd start
```

Dans ce mode, les API natives et la gestion multi-écran ne sont pas disponibles.
Les actions de contenu modifient tout de même l'état de prévisualisation local.
Le lien de prévisualisation ouvre la route `/player-display` dans la même page et
affiche un bouton **Retour au panneau MJ**.

## 8. Arrêter l'application de développement

Ferme les fenêtres puis, dans le terminal qui exécute Tauri, utilise :

```text
Ctrl + C
```

## 9. Limites actuelles

- l'état de la fenêtre n'est pas encore synchronisé en temps réel si elle est
  fermée directement par Windows ;
- les contenus sont encore des médias de démonstration et ne proviennent pas
  d'une campagne persistée ;
- les documents ne sont pas encore proposés dans le panneau MJ ;
- la reconnexion automatique après le retrait d'un moniteur reste à implémenter ;
- la validation multi-écran est pour l'instant manuelle et ciblée sur Windows.

## 10. Dépannage rapide

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
