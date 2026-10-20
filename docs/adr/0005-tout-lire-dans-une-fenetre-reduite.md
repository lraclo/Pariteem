# « Tout lire » ouvre les sites dans une fenêtre réduite, mené par le service worker

Pour savoir sur quel Bookmaker lancer la prochaine Phase, le Trésorier compare les Meilleures Paires de tous les Bookmakers (vue Comparer). Le bouton « Lire tous les Bookmakers » (« Tout lire » dans le code) les lit d'un clic : le service worker ouvre une fenêtre Chrome à part, réduite et non focalisée, y ouvre la page football de chaque Bookmaker dans un onglet, attend que le script de page réponde, lance la même lecture que « Chercher », enregistre la Lecture, puis ferme l'onglet. La fenêtre est fermée à la fin ou sur « Arrêter ». La barre d'onglets du Trésorier ne bouge pas.

La lecture reste conforme à l'ADR 0002 : elle n'a lieu qu'au clic, dans le navigateur du Trésorier, avec ses cookies, et jamais en continu (pas de minuterie, rien à l'ouverture du panneau ou de Chrome). Aucune Lecture ne quitte le navigateur.

L'orchestration est dans le service worker et pas dans le panneau, pour que fermer le panneau n'arrête pas la lecture. Son avancement est publié dans `storage.session` (`session:tout-lire`), que le panneau surveille. Un service worker MV3 s'arrête après 30 s sans événement : les messages de progression, les écritures dans le stockage et un appel d'API toutes les 20 s le gardent en vie. S'il redémarre quand même, la lecture en cours est marquée « Lecture interrompue » et sa fenêtre est fermée.

- Trois sites au plus à la fois : chaque page de Bookmaker est lourde.
- Genybet est lu en dernier et seul, et sauté s'il a été lu il y a moins de 10 minutes : son pare-feu bloque quand les requêtes s'enchaînent (ADR 0004).
- Délais : 30 s pour que la page charge le script de page, 90 s par lecture (150 s pour Betclic). Un échec ne bloque jamais les autres sites.

## Betclic dans une fenêtre réduite

`chercherBetclic` fait défiler la page pour charger toutes les cartes. Dans une fenêtre réduite, la page est masquée (`document.hidden`) : Chrome ralentit les minuteurs et ne produit plus d'images, ce qui peut empêcher le chargement au défilement. Décision : Betclic est d'abord essayé comme les autres. Si l'essai réel lit nettement moins de Matchs qu'un « Chercher » sur l'onglet visible, Betclic passe dans `A_LIRE_A_LA_MAIN` (`lib/tout-lire.ts`) : il est sauté et affiché « À lire à la main », et un clic sur sa ligne ouvre sa page football dans un onglet visible.

Résultat de l'essai (19 octobre 2026, Chrome sur Mac) : 18 Matchs lus dans la fenêtre réduite, contre 636 avec « Chercher » sur l'onglet visible. Le défilement ne charge presque rien dans une page masquée.

Seconde et dernière tentative : les Bookmakers lus par défilement (`lectureParDefilement`, aujourd'hui Betclic seul) sont ouverts dans une petite fenêtre normale (520 × 560), non focalisée, posée dans le coin bas-droit de la fenêtre du Trésorier, et fermée après leur lecture. Elle reste visible pour Chrome pendant une minute environ. Si elle ne suffit pas non plus, Betclic passe dans `A_LIRE_A_LA_MAIN`.

Résultat de la seconde tentative (19 octobre 2026) : 636 Matchs lus par « Tout lire », autant qu'avec « Chercher ». Betclic reste dans « Tout lire », par cette petite fenêtre.

Dans tous les cas, une lecture de « Tout lire » qui ramène moins de la moitié des Matchs à venir de la Lecture précédente (`lectureIncomplete`) ne la remplace pas : le site est marqué en erreur et sa Lecture précédente est gardée. Lors du premier essai, les 18 Matchs avaient remplacé les 636.

## Considered Options

- Ouvrir les sites dans des onglets de la fenêtre du Trésorier : rejeté, la barre d'onglets bougerait pendant deux minutes.
- Mener la lecture depuis le panneau : rejeté, fermer le panneau l'arrêterait.
- Lire les API des Bookmakers depuis le service worker, sans ouvrir de page : rejeté, plusieurs lecteurs dépendent de la page (état intégré de Winamax, défilement de Betclic, jetons des sites), et l'ADR 0004 lit depuis le site lui-même.

## Consequences

- Les lectures passent par les cookies du navigateur, et quatorze sites lus d'affilée ressemblent davantage à un robot qu'un clic sur un seul site. Le panneau demande d'utiliser « Tout lire » avec modération, et prévient au premier clic si tout a été lu il y a moins de 5 minutes ; un second clic relit quand même. Mieux vaut ne pas être connecté à un compte de Bookmaker dans ce navigateur.
- Aucune nouvelle permission : `tabs` suffit pour créer les fenêtres et leurs onglets.
- La petite fenêtre de Betclic apparaît à l'écran pendant sa lecture, sans prendre le focus.
