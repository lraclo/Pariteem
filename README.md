# Pariteem

Extension Chrome qui cherche, sur la plupart des sites de paris agréés en France, les Matchs de football dont les trois Cotes (1, N, 2) dépassent un Seuil, puis calcule le résultat d'une Paire de Matchs couverte sur ses neuf Combinaisons. Le vocabulaire est défini dans [CONTEXT.md](CONTEXT.md).

## Installer

L'extension n'est pas sur le Chrome Web Store, dont le règlement interdit les extensions liées aux jeux d'argent (voir [ADR 0002](docs/adr/0002-lecture-a-la-demande-et-installation-hors-store.md) et [ADR 0003](docs/adr/0003-distribution-par-zip.md)). Elle s'installe une fois, en deux minutes :

1. Télécharger [pariteem.zip](https://github.com/lraclo/Pariteem/releases/latest/download/pariteem.zip) et le décompresser (Mac : double-clic ; Windows : clic droit › **Extraire tout**). Ranger le dossier `pariteem` obtenu à un endroit où il restera, par exemple Documents : Chrome le relit à chaque démarrage, il ne faut pas le supprimer.
2. Dans Chrome, ouvrir `chrome://extensions`, activer **Mode développeur** (en haut à droite), cliquer sur **Charger l'extension non empaquetée** et choisir le dossier `pariteem`.
3. Épingler l'icône Pariteem dans la barre d'outils (la pièce de puzzle, puis l'épingle).

Pour passer à une nouvelle version : télécharger le nouveau zip, remplacer le contenu du dossier `pariteem`, puis cliquer sur ⟳ sous Pariteem dans `chrome://extensions`.

### Publier une version

```bash
npm version patch       # 0.1.0 → 0.1.1 : met à jour package.json, commit et tag v0.1.1
git push --follow-tags  # le workflow Publier crée la Release avec pariteem.zip
```

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

Les réglages sont mémorisés, pas les résultats : les Cotes bougent, relancez une recherche avant de parier.

## Développer

```bash
npm run dev      # reconstruit et recharge l'extension à chaque modification (charger .output/chrome-mv3-dev une fois)
npm test         # tests du Classement, du calculateur et des lecteurs de pages
npm run compile  # vérification TypeScript
```

- `lib/domaine/` : Classement, Pire cas, calculs des deux Phases. Aucune dépendance au navigateur.
- `lib/bookmakers/` : un lecteur par plateforme de paris (plusieurs Bookmakers en partagent une), testé sur des extraits de réponses réelles dans `fixtures/`. Si un site change son API, c'est ici que ça casse ([ADR 0001](docs/adr/0001-lecture-des-cotes-par-bookmaker.md), [ADR 0003](docs/adr/0003-lecture-par-plateforme-via-les-api-des-sites.md)). `index.ts` liste les Bookmakers, `lecteurs.ts` associe chacun à sa lecture.
- `entrypoints/` : script de page, service worker (badge, panneau latéral ou fenêtre selon le navigateur) et panneau en React (`entrypoints/sidepanel/`).
