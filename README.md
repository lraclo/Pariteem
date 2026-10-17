# Pariteem

Extension Chrome qui cherche, sur Winamax ou Betclic, les Matchs de football dont les trois Cotes (1, N, 2) dépassent un Seuil, puis calcule le résultat d'une Paire de Matchs couverte sur ses neuf Combinaisons. Le vocabulaire est défini dans [CONTEXT.md](CONTEXT.md).

## Installer (mode développeur)

L'extension n'est pas sur le Chrome Web Store, dont le règlement interdit les extensions liées aux jeux d'argent (voir [ADR 0002](docs/adr/0002-lecture-a-la-demande-et-installation-hors-store.md)). Chaque membre l'installe une fois :

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

Après avoir chargé ou rechargé l'extension, rechargez aussi les onglets Winamax et Betclic déjà ouverts.

Pour mettre à jour : `git pull`, `npm run build`, puis le bouton ⟳ de Pariteem dans `chrome://extensions`.

## Utiliser

1. Ouvrir Winamax ou Betclic : l'icône affiche un ✓.
2. Cliquer sur l'icône : le panneau latéral s'ouvre à droite de la page. L'extension ne fonctionne que dans Chrome (Arc, par exemple, n'affiche pas les panneaux latéraux d'extension).
3. Régler le **Seuil** (Cote plancher minimale), la **Fenêtre** (3 semaines par défaut, 48 h pour un cycle rapide) et le **Tri**.
4. **Chercher**.
   - Winamax : la page football est lue d'un coup, depuis n'importe quelle page du site.
   - Betclic : il faut être sur la page « Tout le football » (le panneau propose d'y aller), puis la page défile toute seule jusqu’en bas (jusqu’à une minute).
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
- `lib/bookmakers/` : un lecteur par Bookmaker, testé sur des extraits de pages réelles dans `fixtures/`. Si un site change sa structure, c'est ici que ça casse ([ADR 0001](docs/adr/0001-lecture-des-cotes-par-bookmaker.md)).
- `entrypoints/` : script de page, service worker (badge, panneau latéral ou fenêtre selon le navigateur) et panneau en React (`entrypoints/sidepanel/`).
