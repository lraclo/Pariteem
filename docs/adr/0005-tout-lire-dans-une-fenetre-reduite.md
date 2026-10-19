# « Tout lire » ouvre les sites dans une fenêtre réduite, mené par le service worker

Pour savoir sur quel Bookmaker lancer la prochaine Phase, le Trésorier compare les Meilleures Paires de tous les Bookmakers (vue Comparer). Le bouton « Tout lire » les lit d'un clic : le service worker ouvre une fenêtre Chrome à part, réduite et non focalisée, y ouvre la page football de chaque Bookmaker dans un onglet, attend que le script de page réponde, lance la même lecture que « Chercher », enregistre la Lecture, puis ferme l'onglet. La fenêtre est fermée à la fin ou sur « Arrêter ». La barre d'onglets du Trésorier ne bouge pas.

La lecture reste conforme à l'ADR 0002 : elle n'a lieu qu'au clic, dans le navigateur du Trésorier, avec ses cookies, et jamais en continu (pas de minuterie, rien à l'ouverture du panneau ou de Chrome). Aucune Lecture ne quitte le navigateur.

L'orchestration est dans le service worker et pas dans le panneau, pour que fermer le panneau n'arrête pas la lecture. Son avancement est publié dans `storage.session` (`session:tout-lire`), que le panneau surveille. Un service worker MV3 s'arrête après 30 s sans événement : les messages de progression, les écritures dans le stockage et un appel d'API toutes les 20 s le gardent en vie. S'il redémarre quand même, la lecture en cours est marquée « Lecture interrompue » et sa fenêtre est fermée.

- Trois sites au plus à la fois : chaque page de Bookmaker est lourde.
- Genybet est lu en dernier et seul, et sauté s'il a été lu il y a moins de 10 minutes : son pare-feu bloque quand les requêtes s'enchaînent (ADR 0004).
- Délais : 30 s pour que la page charge le script de page, 90 s par lecture (150 s pour Betclic). Un échec ne bloque jamais les autres sites.

## Betclic dans une fenêtre réduite

`chercherBetclic` fait défiler la page pour charger toutes les cartes. Dans une fenêtre réduite, la page est masquée (`document.hidden`) : Chrome ralentit les minuteurs et ne produit plus d'images, ce qui peut empêcher le chargement au défilement. Décision : Betclic est d'abord essayé comme les autres. Si l'essai réel lit nettement moins de Matchs qu'un « Chercher » sur l'onglet visible, Betclic passe dans `A_LIRE_A_LA_MAIN` (`lib/tout-lire.ts`) : il est sauté et affiché « À lire à la main », et un clic sur sa ligne ouvre sa page football dans un onglet visible.

Résultat de l'essai : à compléter après le premier essai réel.

## Considered Options

- Ouvrir les sites dans des onglets de la fenêtre du Trésorier : rejeté, la barre d'onglets bougerait pendant deux minutes.
- Mener la lecture depuis le panneau : rejeté, fermer le panneau l'arrêterait.
- Lire les API des Bookmakers depuis le service worker, sans ouvrir de page : rejeté, plusieurs lecteurs dépendent de la page (état intégré de Winamax, défilement de Betclic, jetons des sites), et l'ADR 0004 lit depuis le site lui-même.

## Consequences

- Les lectures passent par les cookies du navigateur, et quatorze sites lus d'affilée ressemblent davantage à un robot qu'un clic sur un seul site. Le panneau conseille de lancer « Tout lire » sans être connecté à un compte de Bookmaker.
- Aucune nouvelle permission : `tabs` suffit pour créer la fenêtre et ses onglets.
