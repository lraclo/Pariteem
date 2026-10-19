# Lecture des cotes : une méthode par Bookmaker, sur la page « Tout le football »

Pour les Bookmakers ajoutés ensuite, voir l'ADR 0003 (lecture par plateforme via les API JSON des sites).

Pour avoir le plus de Matchs possible avec une seule méthode simple par Bookmaker, l'extension lit uniquement la page qui liste tout le football. Sur Winamax (`/paris-sportifs/sports/1`), elle charge la page en arrière-plan et lit le bloc JSON `PRELOADED_STATE` intégré (~720 Matchs, sans défilement). Sur Betclic (`/football-sfootball`), seuls 20 Matchs sont dans l'état intégré et le reste arrive par une API gRPC-web binaire sur un autre domaine : l'extension fait donc défiler la page de l'onglet jusqu'en bas puis lit les cartes affichées.

## Considered Options

- Appeler les API internes des Bookmakers : rejeté, l'API Betclic est en protobuf binaire et cross-origin, trop fragile.
- Parcourir chaque championnat page par page : rejeté, plus lent et plus de requêtes pour le même résultat.

## Consequences

Chaque Bookmaker a son propre lecteur, qui peut casser quand le site change ; il faut des tests sur des pages enregistrées pour le détecter vite. Sur Betclic, « Chercher » n'est possible que lorsque l'onglet est sur la page football.
