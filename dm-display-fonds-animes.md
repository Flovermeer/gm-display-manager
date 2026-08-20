# GM Display — Décisions pour les fonds animés

## Objectif

Ajouter des fonds animés aux écrans du **GM Display** afin d'éviter les arrière-plans noirs statiques et de renforcer l'ambiance des scènes.

Le système doit pouvoir être utilisé sur plusieurs types d'éléments de campagne :

- lieux ;
- PNJ ;
- monstres.

---

## Types de fonds à prévoir

Le système de fond doit pouvoir accepter plusieurs sources :

- `static` : image fixe ;
- `video` : vidéo locale en boucle ;
- `vanta` : fond animé généré avec Vanta.js / Three.js.

L'objectif est de ne pas enfermer l'application dans une seule solution.

---

## Configuration commune aux lieux, PNJ et monstres

La configuration d'affichage doit être commune aux différents modèles.

Plutôt que d'ajouter directement une propriété `background`, on utilisera une propriété :

```ts
display?: DisplayConfig
```

Cela permettra d'étendre plus tard les options de mise en scène sans ajouter de nombreuses propriétés UI directement aux modèles métier.

### Types envisagés

```ts
type DisplayConfig = {
  background?: {
    type: 'static' | 'video' | 'vanta'
    source?: string
    effect?: 'fog' | 'waves' | 'clouds' | 'net'
    preset?: string
  }
}
```

### Exemple pour les modèles

```ts
type Place = {
  id: string
  name: string
  description: string
  display?: DisplayConfig
}

type Npc = {
  id: string
  name: string
  portrait?: string
  display?: DisplayConfig
}

type Monster = {
  id: string
  name: string
  stats: MonsterStats
  display?: DisplayConfig
}
```

---

## Exemple d'utilisation

### Lieu

```ts
const temple = {
  name: "Temple de Ubtao",
  display: {
    background: {
      type: "vanta",
      effect: "fog",
      preset: "jungle"
    }
  }
}
```

### PNJ

```ts
const rasNsi = {
  name: "Ras Nsi",
  portrait: "/images/ras-nsi.webp",
  display: {
    background: {
      type: "vanta",
      effect: "fog",
      preset: "necrotic"
    }
  }
}
```

---

## Évolutions possibles de `display`

La propriété `display` pourra ensuite accueillir d'autres paramètres liés à la mise en scène :

```ts
display: {
  background: { ... },
  music: "...",
  ambience: "...",
  transition: "fade",
  theme: "dark",
  showName: true
}
```

Cela permet de conserver une séparation claire entre :

- les données métier ;
- les données de présentation destinées à l'écran joueur.

---

# Vanta.js

Pour les fonds animés générés directement dans l'application, **Vanta.js** est retenu comme option intéressante.

Les effets pourront notamment servir pour :

- brume ;
- donjons ;
- jungle ;
- magie ;
- portails ;
- ambiance étrange ;
- ciel / tempête ;
- fonds abstraits.

Pour un écran joueur, les interactions souris / tactile devront généralement être désactivées afin que le fond reste une ambiance passive.

---

## Brouillard retenu

Ce code correspond au brouillard Vanta avec les **couleurs validées** :

```html
<script src="three.r134.min.js"></script>
<script src="vanta.fog.min.js"></script>
<script>
VANTA.FOG({
  el: "#your-element-selector",
  mouseControls: true,
  touchControls: true,
  gyroControls: false,
  minHeight: 200.00,
  minWidth: 200.00,
  highlightColor: 0xb6ff,
  midtoneColor: 0x581e6a,
  lowlightColor: 0x271f47,
  baseColor: 0x6060b,
  speed: 1.50
})
</script>
```

> Ce preset doit être conservé tel quel comme référence visuelle : il produit le brouillard avec les bonnes couleurs.

---

## Gestion technique de Vanta

Lors de l'intégration dans l'application :

- initialiser Vanta lorsque le composant est monté ;
- éviter de recréer l'effet à chaque render ;
- appeler `destroy()` lorsque le composant est démonté ou lorsque le fond est remplacé ;
- éviter de laisser plusieurs instances Three.js tourner simultanément.

---

## Architecture retenue

Le principe général est donc :

```text
Lieu / PNJ / Monstre
        ↓
display
        ↓
background
        ↓
static | video | vanta
```

Le renderer du GM Display se charge ensuite d'afficher le bon type de fond selon la configuration de l'élément actuellement envoyé sur l'écran joueur.
