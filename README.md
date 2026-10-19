# Pariteem

Extension Chrome qui cherche, sur la plupart des sites de paris agréés en France, les Matchs de football dont les trois Cotes (1, N, 2) dépassent un Seuil, puis calcule le résultat d'une Paire de Matchs couverte sur ses neuf Combinaisons. Le vocabulaire est défini dans [CONTEXT.md](CONTEXT.md).

## Installer

L'extension n'est pas sur le Chrome Web Store, dont le règlement interdit les extensions liées aux jeux d'argent (voir [ADR 0002](docs/adr/0002-lecture-a-la-demande-et-installation-hors-store.md) et [ADR 0003](docs/adr/0003-distribution-par-zip.md)). Elle s'installe une fois, en deux minutes :

1. Télécharger [pariteem.zip](https://github.com/lraclo/Pariteem/releases/latest/download/pariteem.zip) et le décompresser (Mac : double-clic ; Windows : clic droit › **Extraire tout**). Ranger le dossier `pariteem` obtenu à un endroit où il restera, par exemple Documents : Chrome le relit à chaque démarrage, il ne faut pas le supprimer.
2. Dans Chrome, ouvrir `chrome://extensions`, activer **Mode développeur** (en haut à droite), cliquer sur **Charger l'extension non empaquetée** et choisir le dossier `pariteem`.
3. Épingler l'icône Pariteem dans la barre d'outils (la pièce de puzzle, puis l'épingle).

Pour passer à une nouvelle version : télécharger le nouveau zip, remplacer le contenu du dossier `pariteem`, puis cliquer sur ⟳ sous Pariteem dans `chrome://extensions`.

### Publier une version

Rien à faire : chaque fusion sur `main` qui touche au code publie une Release avec `pariteem.zip` (workflow **Publier**). Le numéro de version suit le modèle `0.2.<nombre de commits de main>` et monte donc tout seul. Pour marquer une nouveauté, changer les deux premiers chiffres de `"version"` dans `package.json` (par exemple `0.3.0`). Le dernier chiffre de ce fichier n'est pas utilisé.

### En mode développeur

Pour travailler sur le code :

1. Installer [Node.js](https://nodejs.org) (version 20 ou plus).
2. Récupérer le code et construire l'extension :
   ```bash
   git clone https://github.com/lraclo/Pariteem.git
   cd Pariteem
   npm install
   npm run build
   ```
3. Dans Chrome, ouvrir `chrome://extensions`, activer **Mode développeur** (en haut à droite), cliquer sur **Charger l'extension non empaquetée** et choisir le dossier `.output/chrome-mv3`.
4. Épingler l'icône Pariteem dans la barre d'outils.

Après avoir chargé ou rechargé l'extension, rechargez aussi les onglets de Bookmakers déjà ouverts.

Pour mettre à jour : `git pull`, `npm run build`, puis le bouton ⟳ de Pariteem dans `chrome://extensions`.

## Utiliser

1. Ouvrir le site d'un Bookmaker pris en charge : l'icône affiche un ✓. Sites pris en charge : Winamax, Betclic, Unibet, PMU, NetBet, Genybet, Feelingbet, Vbet, CircusBet, DAZN Bet, Olybet, bwin, PokerStars Sports et Betsson (bet365 bloque toute lecture automatique).
2. Cliquer sur l'icône : le panneau latéral s'ouvre à droite de la page. L'extension ne fonctionne que dans Chrome (Arc, par exemple, n'affiche pas les panneaux latéraux d'extension).
3. Régler le **Seuil** (Cote plancher minimale), la **Fenêtre** (3 semaines par défaut, 48 h pour un cycle rapide) et le **Tri**.
4. **Chercher**.
   - Betclic : il faut être sur la page « Tout le football » (le panneau propose d'y aller), puis la page défile toute seule jusqu’en bas (jusqu’à une minute).
   - Tous les autres : depuis n'importe quelle page du site, en quelques secondes (une vingtaine pour NetBet, Feelingbet et Genybet, dont les pages sont lues une à une). Sur Genybet, évitez d'enchaîner les recherches : son pare-feu bloque temporairement les requêtes trop nombreuses.
   - L'horizon dépend du Bookmaker : la plupart proposent deux à trois semaines de Matchs, bwin une dizaine de jours.
5. Le Classement affiche les dix meilleures Cotes planchers. Cocher deux Matchs, ou cliquer sur **Meilleure Paire**, pour voir les neuf Combinaisons en **Phase dépôt** ou **Phase freebet**.
6. Les conditions de l'offre de bienvenue (montant, cote minimale, remboursement en cash ou en Freebet) se règlent par Bookmaker sous le tableau. Vérifiez-les sur le site du Bookmaker : elles changent souvent.
7. **Comparer** (onglet en haut du panneau, accessible depuis n'importe quel site) : une ligne par Bookmaker (ceux pas encore lus en gris, à la fin), avec sa Meilleure Paire, son Pire cas et la Cote plancher de chacun des deux Matchs, classés par Pire cas. Le Seuil et la Fenêtre sont les mêmes que dans Chercher. Un ⚠ signale une Paire sous les cotes minimales de l'offre de bienvenue. Cliquer sur une ligne affiche ce Bookmaker dans Chercher, avec la Paire déjà cochée et son Calculateur (Phase dépôt, Phase freebet, Espérance), sans ouvrir son site : « Voir » sur un Match l'ouvre au besoin, et « Ouvrir … pour chercher » permet de le relire.
8. **Lire tous les Bookmakers** (en haut de Comparer) lit tous les Bookmakers d'un clic, dans une fenêtre Chrome réduite qui se ferme à la fin (deux minutes environ, trois sites à la fois, Genybet en dernier). Betclic, qui se lit en faisant défiler sa page, s'ouvre dans une petite fenêtre au coin de l'écran, refermée après sa lecture. Une lecture qui ramène moins de la moitié des Matchs de la précédente ne la remplace pas. Chaque ligne montre son avancement : « En attente », « Lecture… », ✓ ou ✗. **Arrêter** ferme la fenêtre et garde les Lectures déjà faites. Fermer le panneau n'arrête pas la lecture. Genybet n'est pas relu s'il l'a été il y a moins de 10 minutes. À utiliser avec modération : quatorze sites lus d'affilée ressemblent davantage à un robot, et le panneau prévient si tout a été lu il y a moins de 5 minutes. Mieux vaut aussi ne pas être connecté à un compte de Bookmaker dans ce navigateur ([ADR 0005](docs/adr/0005-tout-lire-dans-une-fenetre-reduite.md)).

Chaque Lecture (les Matchs lus et leur heure) est mémorisée par Bookmaker, même après un redémarrage de Chrome : « Lu il y a 12 min » passe en orange après 30 minutes et en rouge après 3 heures. Les Cotes bougent : relancez une recherche avant de parier.

## Développer

```bash
npm run dev      # reconstruit et recharge l'extension à chaque modification (charger .output/chrome-mv3-dev une fois)
npm test         # tests du Classement, du calculateur et des lecteurs de pages
npm run compile  # vérification TypeScript
```

- `lib/domaine/` : Classement, Pire cas, calculs des deux Phases, Comparaison des Bookmakers. Aucune dépendance au navigateur.
- `lib/lectures.ts` : la dernière Lecture de chaque Bookmaker, dans `storage.local`.
- `lib/tout-lire.ts` : l'ordre de lecture de « Tout lire », testé sans navigateur ; la fenêtre réduite et les onglets sont gérés par le service worker (`entrypoints/background.ts`).
- `lib/bookmakers/` : un lecteur par plateforme de paris (plusieurs Bookmakers en partagent une), testé sur des extraits de réponses réelles dans `fixtures/`. Si un site change son API, c'est ici que ça casse ([ADR 0001](docs/adr/0001-lecture-des-cotes-par-bookmaker.md), [ADR 0004](docs/adr/0004-lecture-par-plateforme-via-les-api-des-sites.md)). `index.ts` liste les Bookmakers, `lecteurs.ts` associe chacun à sa lecture.
- `entrypoints/` : script de page, service worker (badge, panneau latéral, « Tout lire ») et panneau en React (`entrypoints/sidepanel/`, une vue par onglet : `Chercher.tsx` et `Comparer.tsx`).
