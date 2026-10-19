# Distribution par Chrome Enterprise Core

Le Chrome Web Store étant exclu (ADR 0002) et le mode développeur trop lourd pour les Trésoriers (Node, build, mises à jour à la main), chaque Trésorier inscrit une fois son Chrome à une console Chrome Enterprise Core (gratuite) en collant une commande dans le Terminal. La console impose Pariteem par son ID et une URL de mise à jour qui pointe vers la dernière Release GitHub ; Chrome n'accepte une extension hors Store imposée que sur un navigateur géré, et l'inscription à Chrome Enterprise Core suffit à le rendre géré. Le `.crx` est signé avec une clé conservée hors du dépôt (secret GitHub `CLE_CRX`) : c'est elle qui fixe l'ID de l'extension.

Alternative écartée : un zip dans les Releases chargé en mode développeur, avec une alerte « nouvelle version » dans le panneau. Moins de mise en place côté Liste, mais chaque mise à jour reste manuelle pour chaque Trésorier.

## Consequences

Le Chrome des Trésoriers affiche « Géré par votre organisation » et la console voit la version de Chrome et les extensions installées. Perdre la clé de signature change l'ID de l'extension : il faut alors la déclarer à nouveau dans la console. Procédure : [docs/distribution.md](../distribution.md).
