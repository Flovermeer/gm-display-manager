# Consignes pour les agents

## Langue et collaboration

- Communiquer en français et tutoyer l'utilisateur.
- Donner des réponses directes, concrètes et adaptées à un développeur expérimenté en frontend TypeScript.
- Expliquer les choix propres à Angular, Tauri ou Rust lorsqu'ils ne sont pas évidents.
- Signaler clairement toute hypothèse susceptible de modifier le périmètre fonctionnel.
- Poser des questions à l'utilisateur avant de prendre une décision de produit, d'architecture, d'expérience utilisateur, de modèle de données, de périmètre ou de comportement.
- Préférer poser trop de questions plutôt que pas assez lorsqu'un choix peut influencer le résultat.
- Ne poser qu'une seule question à la fois, attendre la réponse, puis poursuivre avec la question suivante jusqu'à disposer d'assez de contexte pour travailler.
- Ne pas regrouper plusieurs décisions dans une même question.
- Une fois le contexte et les décisions nécessaires obtenus, avancer de manière autonome dans le périmètre convenu.
- L'utilisateur laisse généralement l'agent avancer de manière autonome dans le périmètre demandé.

## Installation de dépendances et d'outils

Toute installation ou mise à jour doit obligatoirement être effectuée par l'utilisateur.

- Ne jamais lancer une commande qui installe, ajoute, met à jour ou télécharge une dépendance, un plugin, un SDK ou un outil système.
- Cette règle couvre notamment `npm install`, `npm add`, `ng add`, `npx` lorsqu'il télécharge un paquet, `cargo add`, `cargo install`, les plugins Tauri et les gestionnaires de paquets système.
- Ne pas modifier manuellement un manifeste ou un fichier de verrouillage pour simuler une installation.
- Lorsqu'une installation est nécessaire, expliquer brièvement son rôle, la raison du choix et son impact sur le projet.
- Fournir ensuite la commande exacte à exécuter, puis attendre que l'utilisateur confirme son exécution avant de poursuivre les travaux qui en dépendent.
- Les commandes qui utilisent uniquement des dépendances déjà présentes, comme le build, le lint ou les tests du projet, restent autorisées.

## Organisation des agents

- Un agent principal conserve la vision globale, coordonne le travail et réalise l'implémentation courante.
- Ne jamais créer ni solliciter de sous-agent sans autorisation explicite de l'utilisateur.
- Ne pas mettre en place de superviseur séparé ou d'équipe permanente par défaut : le coût de coordination n'est pas justifié pour la taille actuelle du projet.
- Lorsqu'une délégation est autorisée, la réserver à une tâche indépendante et clairement bornée, par exemple une recherche documentaire, une revue en lecture seule, un prototype isolé ou une matrice de tests.
- Éviter que plusieurs agents modifient simultanément les fichiers structurants Angular, Tauri, SQLite ou les mêmes zones du dépôt.
- L'agent principal reste responsable de relire, intégrer et vérifier tout résultat produit par un sous-agent.
- Reconsidérer cette organisation uniquement lorsque les frontières du projet sont stabilisées et que plusieurs travaux réellement indépendants peuvent avancer en parallèle.

## Sources de vérité

Lire ces documents avant toute décision d'architecture ou implémentation importante :

1. `AGENTS.md` ;
2. `dm-display-manager-specs.md` pour la vision produit, l'usage en partie et les contraintes matérielles ;
3. `dm-campaign-display-stack.md` pour la stack et l'architecture retenues ;
4. les fichiers réellement présents dans le dépôt, qui priment sur les exemples théoriques des spécifications lorsque le projet évolue.

En cas de contradiction entre les deux documents de cadrage, ne pas choisir silencieusement : décrire le conflit et proposer l'option la plus cohérente avec le MVP.

## Vision du produit

Le projet est une application desktop locale destinée à préparer et piloter une campagne de JDR en présentiel.

Les responsabilités doivent rester séparées :

- Foundry VTT gère la battlemap, la grille, le fog of war et éventuellement le combat ;
- DM Campaign & Display Manager gère les campagnes, notes, PNJ, lieux, scènes, relations et médias ;
- le Player Display met en scène les visuels destinés aux joueurs.

L'application complète Foundry et ne cherche pas à le remplacer. Elle ne doit pas non plus devenir un clone généraliste d'Obsidian ou de Notion.

## Stack de référence

- Tauri 2 pour le shell desktop et les fonctionnalités natives ;
- Angular stable avec composants standalone ;
- Angular Router ;
- Signals et services pour l'état applicatif ;
- Tiptap pour les notes riches ;
- SQLite pour les données structurées ;
- filesystem local pour les images, vidéos et fichiers audio ;
- CSS pour les transitions, avec GSAP seulement si un besoin concret le justifie ;
- TypeScript pour l'essentiel de la logique applicative ;
- Rust limité aux besoins natifs que Tauri ou ses plugins ne couvrent pas proprement.

Ne pas introduire NgRx, un backend HTTP ou une infrastructure distante sans besoin démontré et accord de l'utilisateur.

## Priorité du MVP

Avancer par tranches verticales petites et vérifiables. La première preuve de concept doit permettre de :

1. lancer Angular dans Tauri ;
2. détecter les moniteurs disponibles ;
3. associer le rôle Player Display à un moniteur choisi par l'utilisateur ;
4. ouvrir une fenêtre dédiée en plein écran sur ce moniteur ;
5. afficher depuis le panneau MJ un lieu, un PNJ ou un écran noir.

Le premier critère de réussite est simple : un clic sur le laptop du MJ provoque immédiatement le bon affichage sur l'écran des joueurs.

## Principes d'implémentation

- Privilégier la fiabilité en pleine partie, la simplicité et les retours visuels explicites.
- Ne jamais supposer que les numéros ou l'ordre des moniteurs Windows restent stables.
- Conserver localement l'association entre un moniteur et son rôle.
- Concevoir l'application pour fonctionner hors ligne pendant une session.
- Stocker les métadonnées et les relations dans SQLite, mais les médias volumineux dans le filesystem.
- Isoler les accès natifs et SQLite derrière des services ou repositories testables.
- Garder le Player Display sans contrôles destinés au MJ.
- Prévoir une image statique de secours pour chaque média vidéo animé important.
- Utiliser des migrations explicites pour toute évolution du schéma SQLite.
- Éviter les abstractions prématurées et les dépendances sans bénéfice immédiat pour la tranche en cours.
- Préserver la séparation entre état métier, persistance, commandes Tauri et rendu des fenêtres.

## Hors périmètre initial

Ne pas ajouter sans demande explicite :

- backend Spring, Laravel ou Node ;
- API REST locale ;
- Docker ou serveur de base de données ;
- cloud, synchronisation distante ou authentification ;
- application mobile ou contrôle par téléphone ;
- Stream Deck ou macro pad ;
- génération IA en temps réel ;
- intégration ou synchronisation avancée avec Foundry ;
- gestion complète des règles D&D ;
- reconnaissance vocale, éclairage connecté ou audio multiroom.

## Modification du dépôt

- Inspecter les fichiers concernés avant de proposer ou d'effectuer une modification.
- Préserver les changements existants de l'utilisateur et éviter toute réécriture sans rapport avec la demande.
- Ne modifier que ce qui est nécessaire à la tâche en cours.
- Garder les fichiers et identifiants en anglais lorsque cela concerne le code ; utiliser un libellé français dans l'interface lorsque le produit l'exige.
- Mettre à jour la documentation lorsqu'une décision d'architecture, un contrat ou une procédure de lancement change.
- Ne pas ajouter de données de campagne, médias protégés, secrets ou chemins absolus propres à une machine dans le dépôt.

## Vérification et livraison

- Exécuter les contrôles pertinents disponibles pour la zone modifiée : formatage, lint, tests ciblés et build.
- Pour le code multi-écran, distinguer ce qui est couvert automatiquement de ce qui exige une vérification manuelle avec plusieurs moniteurs physiques.
- Ne pas prétendre avoir validé un comportement matériel qui n'a pas pu être observé.
- À la fin d'une modification, résumer le résultat, les vérifications effectuées et les éventuels points restant à tester manuellement.

## Besoins à confirmer avec l'utilisateur au moment opportun

Ces décisions ne doivent pas bloquer le démarrage, mais devront être confirmées avant les fonctionnalités concernées :

- systèmes d'exploitation officiellement supportés au-delà de Windows ;
- emplacement des campagnes, des médias et des sauvegardes ;
- stratégie d'import, de copie ou de référencement des fichiers externes ;
- comportement attendu si un moniteur configuré est absent ou remplacé ;
- format d'export et de sauvegarde d'une campagne ;
- besoins exacts de pilotage de la fenêtre Foundry dans une phase ultérieure.
