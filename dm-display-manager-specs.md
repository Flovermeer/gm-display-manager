# Projet — DM Display Manager pour parties D&D en présentiel

## 1. Objectif

Créer un setup numérique pour des parties de D&D jouées **en présentiel**, sans transformer la table en VTT intégral.

Le numérique doit servir principalement à :

- afficher les battle maps sur un écran horizontal intégré/posé dans la table ;
- afficher aux joueurs les portraits des PNJ, les illustrations de lieux et éventuellement d’autres visuels narratifs ;
- permettre au MJ de piloter tous les affichages depuis son PC portable ;
- conserver une expérience physique : figurines, dés, fiches et échanges autour de la table.

L’application envisagée sert donc de **régie / console de présentation pour le MJ**, et non de remplacement de Foundry VTT.

---

## 2. Setup physique souhaité

### Côté MJ

- Un **PC portable**.
- Le PC est le poste de contrôle principal.
- Le MJ doit pouvoir piloter tous les écrans depuis ce PC.
- Pas de dépendance prévue à un Stream Deck ou à un matériel de contrôle spécifique pour la V1.

### Côté joueurs

Deux affichages distincts.

#### A. Battlemap horizontale

- Écran placé à plat au centre de la table.
- Utilisé principalement pour :
  - Foundry VTT ;
  - cartes de combat ;
  - exploration ;
  - décors / battle maps.
- Les figurines physiques sont posées directement sur une protection transparente au-dessus de l’écran.
- L’écran n’a pas besoin d’être tactile.
- Foundry reste indépendant de l’application de régie.

#### B. Écran narratif côté joueurs

Petit écran intégré dans l’écran physique du MJ, orienté **vers les joueurs**.

Il doit pouvoir afficher :

- portrait du PNJ actuellement présent dans la scène ou auquel les PJ parlent ;
- illustration d’un lieu ;
- illustration d’un objet ;
- document ou indice ;
- visuel d’ambiance ;
- écran noir / neutre si nécessaire.

Format envisagé :

- tablette ;
- ou, de préférence techniquement, petit moniteur HDMI / USB-C de ~10 à 15,6".

Le moniteur dédié est probablement plus simple qu’une tablette car Windows peut le gérer directement comme écran supplémentaire.

---

## 3. Philosophie d’utilisation

Le setup ne doit pas remplacer le jeu physique.

### Battlemap

Usage essentiellement fonctionnel :

- carte ;
- fog of war ;
- éclairages ;
- décors ;
- éventuellement effets visuels ;
- Foundry VTT.

### Écran narratif

Usage essentiellement immersif :

- PNJ ;
- lieux ;
- ambiance ;
- documents ;
- transitions visuelles.

L’écran narratif est le principal élément de mise en scène.

---

## 4. Foundry VTT

Foundry VTT peut être utilisé en présentiel.

Architecture prévue :

- Foundry tourne sur le PC du MJ ;
- une vue MJ reste sur le laptop ;
- une vue joueur/table est affichée sur l’écran horizontal ;
- les figurines physiques peuvent continuer à être utilisées sur la dalle.

L’application de régie **ne doit pas remplacer Foundry**.

Elle doit simplement pouvoir cohabiter avec lui.

À terme, une intégration Foundry peut être envisagée, mais elle n’est pas nécessaire pour une première version.

---

## 5. Application de régie

Nom de travail possible :

**DM Display Manager**

L’application doit détecter et gérer plusieurs écrans.

Exemple :

```text
PC MJ
│
├── Display 1 : interface MJ
│
├── Display 2 : battlemap / Foundry
│
└── Display 3 : écran narratif joueurs
```

### Écran MJ / Control Panel

Le MJ dispose d’une interface de contrôle sur son laptop.

Exemple conceptuel :

```text
BATTLEMAP
[ Foundry ] [ Map ] [ Black ]

DISPLAY JOUEURS

PNJ
[ Syndra ] [ Wakanga ] [ Zhanthi ]

LIEUX
[ Port Nyanzaru ] [ Villa ] [ Jungle ]

AUTRES
[ Document ] [ Objet ] [ Black ] [ Ambiance ]
```

Le but est que les changements d’affichage se fassent en **1 clic**, sans manipuler des fenêtres Windows pendant la partie.

---

## 6. Gestion indépendante des displays

Les deux écrans joueurs ont des rôles différents et doivent rester indépendants.

### Display battlemap

Modes possibles :

- Foundry ;
- image statique ;
- écran noir ;
- éventuellement vidéo / animation de carte.

Mais son contenu devrait changer relativement peu pendant une session.

### Display narratif

Modes beaucoup plus dynamiques :

- NPC ;
- Location ;
- Item ;
- Document ;
- Ambience ;
- Black.

C’est lui qui nécessite les transitions et animations.

---

## 7. Portraits de PNJ animés

Les portraits des PNJ ne doivent pas parler ni faire du lip-sync.

Le but est simplement d’éviter l’effet **image complètement figée**.

### Animation recherchée

Animation très subtile :

- respiration légère ;
- clignement occasionnel ;
- micro-mouvements des yeux ;
- très léger mouvement de tête ;
- vêtements / cheveux légèrement animés ;
- fumée, feu, pluie ou éléments du décor en mouvement ;
- caméra idéalement fixe.

À éviter :

- grands mouvements ;
- personnage qui parle ;
- lip-sync ;
- travelling caméra permanent ;
- animation trop spectaculaire ;
- effet uncanny.

### Génération

Les animations peuvent être générées avant la session avec un outil IA image-to-video.

Exemples possibles :

- Runway ;
- Kling ;
- Luma ;
- autre outil image-to-video adapté au moment du développement.

Les animations doivent être **pré-calculées**.

Pas besoin de génération IA en temps réel pendant la partie.

### Format

Structure possible :

```text
assets/
  npcs/
    wakanga/
      portrait.webp
      idle.webm

    syndra/
      portrait.webp
      idle.webm
```

Le portrait statique sert de fallback.

Le fichier vidéo sert à l’animation idle.

Le rendu peut simplement utiliser :

```html
<video autoplay muted loop>
```

---

## 8. Mise en scène de l’écran narratif

Le visuel PNJ ne doit pas nécessairement occuper brutalement tout l’écran.

Concept intéressant :

- illustration du lieu comme fond ;
- PNJ au premier plan ;
- nom du PNJ ;
- transitions douces.

Exemple :

```text
┌────────────────────────────────┐
│                                │
│        image du lieu           │
│                                │
│             PNJ                │
│         idle animation         │
│                                │
│        WAKANGA O'TAMU          │
│                                │
└────────────────────────────────┘
```

Comportement possible :

1. Les joueurs arrivent dans un lieu.
2. L’écran affiche l’illustration du lieu.
3. Un PNJ intervient.
4. Le fond s’assombrit légèrement.
5. Le portrait animé apparaît.
6. Son nom apparaît avec une transition.
7. À la fin de la conversation, le portrait disparaît.
8. L’image du lieu redevient l’affichage principal.

---

## 9. Gestion du contexte / scènes

À terme, il serait utile que l’application connaisse la **scène actuelle**.

Exemple :

```text
Port Nyanzaru
└── Villa de Wakanga
    └── Wakanga O'Tamu
```

Ainsi :

- affichage du lieu → Villa de Wakanga ;
- affichage du PNJ → Wakanga par-dessus ;
- fermeture du PNJ → retour automatique à la villa.

Cela permet d’éviter de devoir gérer manuellement chaque retour d’écran.

---

## 10. Stack technique envisagée

### Option recommandée

**Tauri + frontend web**

Frontend possible :

- Angular ;
- React ;
- Vue.

Angular est parfaitement utilisable si souhaité.

### Pourquoi Tauri ?

Tauri permet :

- application desktop ;
- plusieurs fenêtres ;
- gestion des moniteurs ;
- fenêtres fullscreen ;
- communication entre fenêtres ;
- faible empreinte par rapport à Electron ;
- frontend en TypeScript / framework web ;
- accès aux fonctionnalités natives lorsque nécessaire.

Rust n’est pas censé constituer la majorité du projet.

Une grande partie de l’application peut rester en TypeScript.

---

## 11. Architecture proposée

```text
┌─────────────────────────────────┐
│             PC MJ               │
│                                 │
│  Tauri Control Panel            │
│                                 │
│  - personnages                  │
│  - lieux                        │
│  - scènes                       │
│  - transitions                  │
│  - choix des displays           │
│                                 │
└─────────────┬───────────────────┘
              │
       commandes / events
              │
        ┌─────┴─────────┐
        │               │
        ▼               ▼

 Display Battlemap   Display Narratif

 Foundry             PNJ
 cartes              lieux
 images              documents
                     animations
```

---

## 12. Foundry et Tauri

Foundry peut rester complètement indépendant.

### V1

Le MJ lance Foundry séparément.

Foundry est placé sur le display battlemap.

Tauri s’occupe uniquement :

- du control panel ;
- de l’écran narratif.

C’est la solution la plus robuste.

### Plus tard

Possibilités :

- module Foundry ;
- API / hooks Foundry ;
- commande depuis Tauri ;
- synchronisation de certaines scènes ;
- récupération du combat ou du PNJ actif.

Mais **ne pas commencer par cette intégration**.

---

## 13. Transitions / animations UI

Pour les transitions de l’écran narratif :

### CSS

Suffisant pour :

- fade ;
- scale ;
- slide ;
- blur ;
- assombrissement du fond.

### GSAP

Peut être ajouté si l’on veut :

- timelines ;
- transitions complexes ;
- animation coordonnée du fond + portrait + texte ;
- effets plus cinématiques.

Ce n’est pas indispensable pour la V1.

---

## 14. Stream Deck / macro pad

Pas prévu immédiatement.

L’application doit rester indépendante du matériel de contrôle.

Une future télécommande pourrait utiliser :

- raccourcis clavier globaux ;
- macro pad ;
- Stream Deck ;
- tablette ;
- téléphone.

### Bonne architecture

```text
Matériel de contrôle
        ↓
commande
        ↓
DM Display Manager
        ↓
displays
```

Le Stream Deck ne doit pas devenir le cœur du système.

---

## 15. Proposition de MVP

Ne pas essayer de développer directement le setup complet.

### MVP 1 — Multi-display

Objectif :

- lancer Tauri ;
- détecter les écrans ;
- identifier :
  - écran MJ ;
  - écran narratif ;
- ouvrir une fenêtre fullscreen sur l’écran narratif ;
- envoyer une image depuis le control panel.

Critère de réussite :

> clic sur un bouton du laptop → portrait affiché sur l’écran joueurs.

### MVP 2 — Bibliothèque de médias

Ajouter :

- PNJ ;
- lieux ;
- images ;
- vidéos WebM.

Structure de données minimale :

```ts
type Media = {
  id: string;
  name: string;
  type: 'npc' | 'location' | 'item' | 'document';
  image?: string;
  video?: string;
};
```

### MVP 3 — Transitions

Ajouter :

- fade in/out ;
- affichage du nom ;
- background + portrait ;
- animation idle.

### MVP 4 — Scènes

Ajouter une notion de contexte :

```ts
type Scene = {
  id: string;
  name: string;
  background: Media;
  activeNpc?: Media;
};
```

L’application peut alors automatiquement revenir au lieu après fermeture du portrait.

### MVP 5 — Battlemap helper

Optionnel.

Ajouter éventuellement :

- détection / placement automatique de la fenêtre Foundry ;
- bouton pour masquer la battlemap ;
- bouton écran noir ;
- lancement d’une carte ou d’un visuel.

Foundry reste toutefois externe.

### MVP 6 — Contrôle externe

Seulement si le besoin apparaît :

- raccourcis globaux ;
- macro pad ;
- Stream Deck ;
- API locale.

---

## 16. Contraintes techniques importantes

### Robustesse

Pendant une partie, l’outil doit être fiable.

Priorités :

1. clic ;
2. changement d’image immédiat ;
3. transitions fluides ;
4. aucun popup Windows ;
5. aucun besoin de réorganiser les fenêtres manuellement.

Les effets spectaculaires viennent après.

### Offline

L’application devrait fonctionner **sans connexion Internet pendant une partie**.

Les médias doivent donc être stockés localement.

L’IA sert uniquement à préparer les assets avant la session.

### Fallback

Chaque portrait animé doit pouvoir disposer d’une image statique de secours.

Si une vidéo ne charge pas :

```text
idle.webm → erreur
↓
portrait.webp
```

### Configuration des écrans

Éviter de supposer :

```text
Display 2 = table
Display 3 = narratif
```

Prévoir un écran de configuration permettant de choisir le rôle de chaque moniteur.

Cette configuration peut être mémorisée localement.

---

## 17. Contraintes matérielles retenues

### Battlemap

Cible probable :

- 27 à 32 pouces ;
- écran fin ;
- HDMI ;
- idéalement alimentation externe ;
- dalle mate ;
- VESA utile mais non indispensable ;
- protection transparente au-dessus.

Une taille de 27" semble être un très bon compromis :

- suffisamment grande pour une battlemap ;
- facilement atteignable par les joueurs ;
- reste transportable ;
- permet un caisson relativement fin.

### Écran narratif

Probablement :

- 10 à 15,6" ;
- HDMI ou USB-C ;
- très fin ;
- monté dans l’écran du MJ ;
- écran tourné vers les joueurs.

Un moniteur portable semble techniquement plus simple qu’une tablette.

---

## 18. Points volontairement hors scope au début

Ne pas commencer par :

- Stream Deck ;
- reconnaissance vocale ;
- génération IA live ;
- synchronisation complète avec Foundry ;
- gestion automatique de l’initiative ;
- éclairage Hue/WLED ;
- audio multiroom ;
- serveur distant ;
- contrôle via téléphone ;
- éditeur complexe de campagnes.

Tous ces éléments peuvent éventuellement venir ensuite.

---

## 19. Vision finale possible

À terme, le MJ pourrait préparer des scènes avant la partie.

Exemple :

```text
SCÈNE : Villa de Wakanga

Background
→ villa.webp

NPC disponibles
→ Wakanga
→ garde
→ serviteur

Ambiance
→ port-nyanzaru.mp3

Battlemap
→ wakanga-villa

Actions
→ Show NPC
→ Hide NPC
→ Show map
→ Show document
→ Black screen
```

Pendant la partie :

```text
clic : Villa de Wakanga
→ illustration du lieu

clic : Wakanga
→ portrait animé de Wakanga
→ nom
→ background conservé

clic : Hide NPC
→ retour à la villa

clic : Combat
→ battlemap Foundry
```

L’objectif final est d’obtenir une **régie de partie très rapide à utiliser**, qui enrichit la mise en scène sans détourner l’attention du MJ de ses joueurs.

---

## 20. Priorité lors de la reprise du projet

Commencer petit.

Première preuve de concept :

1. créer une app Tauri ;
2. détecter deux moniteurs ;
3. ouvrir une fenêtre fullscreen sur le second ;
4. avoir trois boutons sur le laptop :
   - lieu ;
   - PNJ ;
   - noir ;
5. afficher un `.webp` ou un `.webm` selon le bouton.

Si cette partie fonctionne bien, l’architecture de base est validée.

Tout le reste peut ensuite être ajouté progressivement.
