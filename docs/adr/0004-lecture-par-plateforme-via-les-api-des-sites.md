# Lecture par plateforme, via les API JSON que les sites appellent eux-mêmes

Pour couvrir la plupart des Bookmakers agréés par l'ANJ, l'extension lit l'offre football par l'API JSON qu'utilise déjà la page du Bookmaker, appelée depuis l'onglet ouvert sur son site (même origine, mêmes cookies). Beaucoup de Bookmakers partagent une plateforme : un lecteur par plateforme sert plusieurs sites, avec un petit réglage par site (adresse de l'API, identifiant de partenaire, forme des liens).

| Plateforme | Bookmakers | Lecture |
| --- | --- | --- |
| Winamax | Winamax | état intégré de la page football (ADR 0001) |
| Betclic | Betclic | défilement de la page football (ADR 0001) |
| FDJ (lvs-api) | Unibet (Parions Sport En Ligne et ZEbet y redirigent) | pages de 100 Matchs, avec le jeton anonyme du site |
| Kambi | PMU | CDN public : tout le football, puis chaque pays (la liste générale s'arrête à 7 jours) |
| Sport&Co | NetBet, Genybet, Feelingbet | pages de 20 prochains Matchs, espacées |
| BetConstruct (Swarm) | Vbet, CircusBet, DAZN Bet, Olybet | une requête WebSocket pour tout le football avant-match |
| Entain (CDS) | bwin | une requête |
| Flutter (ISP) | PokerStars Sports | une requête par compétition (la liste « Matchs » s'arrête à 48 h) |
| Betsson | Betsson | une requête sur trois semaines |

ADR 0001 rejetait les API internes à cause de celle de Betclic (protobuf binaire, autre domaine) ; ces API-ci sont en JSON, servies au site lui-même, et plus stables que le HTML des pages. Betclic et Winamax gardent leur méthode.

## Considered Options

- Lire le HTML des pages : rejeté, la plupart des sites n'affichent qu'une partie des Matchs et changent souvent leur balisage.
- Un lecteur générique qui reconnaît des cotes 1/N/2 dans n'importe quelle page : rejeté, les dates et les noms d'équipes y sont trop peu fiables.

## Consequences

- bet365 n'est pas pris en charge : son site refuse tout accès qui ne vient pas d'un navigateur piloté par un humain.
- Genybet est derrière un pare-feu anti-robots (F5) qui refuse au hasard près d'une requête sur trois et bloque le navigateur pendant un moment quand elles s'enchaînent trop : ses pages sont espacées de 1,5 s et chaque requête refusée est relancée jusqu'à six fois. Il ne faut pas multiplier les recherches.
- Chaque lecteur est testé sur un extrait de réponse réelle dans `lib/bookmakers/fixtures/` ; quand un site change son API, c'est ce test qu'il faut refaire sur une réponse fraîche.
