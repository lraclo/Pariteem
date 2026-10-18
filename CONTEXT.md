# Pariteem

Extension Chrome qui aide le trésorier d'une liste BDE à choisir des combinés de deux matchs de football couvrant toutes les combinaisons, pour transformer des bonus de bienvenue en gains.

## Acteurs

**Liste**:
L'association étudiante (liste BDE) qui finance sa campagne grâce à l'opération.
_Avoid_: BDE, équipe

**Trésorier**:
Le membre de la Liste qui choisit les combinés et indique à chaque Titulaire quoi miser.
_Avoid_: organisateur, admin

**Titulaire**:
Un membre majeur de la Liste qui détient en son nom propre un compte chez un Bookmaker.
_Avoid_: compte, joueur, parieur

**Bookmaker**:
Un opérateur de paris sportifs agréé (Betclic, Winamax…) dont le site est lu par l'extension.
_Avoid_: site de paris, opérateur

## Paris

**Match**:
Une rencontre de football proposée par un Bookmaker, avec une Cote pour chacune de ses trois Issues.
_Avoid_: événement, rencontre

**Issue**:
Un des trois résultats possibles d'un Match : victoire domicile (1), nul (N), victoire extérieur (2).
_Avoid_: possibilité, résultat, option

**Cote**:
Le multiplicateur proposé par le Bookmaker pour une Issue.
_Avoid_: odd

**Cote plancher**:
La plus faible des trois Cotes d'un Match.
_Avoid_: cote minimum

**Seuil**:
La Cote plancher minimale qu'un Match doit atteindre pour être retenu (par exemple 2,5).
_Avoid_: filtre, limite

**Fenêtre**:
La période à venir dans laquelle un Match doit commencer pour être retenu (trois semaines par défaut, 48 h pour un cycle rapide).
_Avoid_: période, horizon

**Classement**:
Les dix Matchs de la Fenêtre ayant les plus grosses Cotes planchers au-dessus du Seuil.
_Avoid_: top 10, résultats

**Paire**:
Deux Matchs distincts d'un même Bookmaker, candidats pour former les Combinés d'une Phase.
_Avoid_: duo, couple

**Combinaison**:
Un couple d'Issues, une par Match de la Paire ; une Paire en compte neuf.
_Avoid_: possibilité, scénario

**Cote combinée**:
Le produit des deux Cotes d'une Combinaison.
_Avoid_: cote totale

**Pire cas**:
La plus faible Cote combinée des neuf Combinaisons d'une Paire, égale au produit des deux Cotes planchers.
_Avoid_: cote garantie, minimum

**Espérance**:
Le résultat net moyen attendu d'une Phase : le net de chaque Combinaison pondéré par sa probabilité, déduite des Cotes une fois la marge du Bookmaker retirée.
_Avoid_: moyenne, gain moyen

**Meilleure Paire**:
Les deux premiers Matchs du Classement, c'est-à-dire la Paire dont le Pire cas est le plus élevé.
_Avoid_: meilleure combinaison

**Combiné**:
Le pari placé par un Titulaire sur une Combinaison.
_Avoid_: ticket, pari multiple

## Opération

**Phase dépôt**:
La première étape, où neuf Titulaires misent chacun 100 € d'argent réel sur une Combinaison différente d'une même Paire.
_Avoid_: tour 1, phase 1

**Freebet**:
Le pari gratuit offert par le Bookmaker à un Titulaire dont le premier Combiné est perdant ; s'il gagne, seul le gain net est versé (mise non rendue).
_Avoid_: bonus, pari gratuit

**Phase freebet**:
L'étape suivante sur une nouvelle Paire : les huit Titulaires perdants misent leur Freebet, et un nouveau Titulaire couvre la neuvième Combinaison par un dépôt.
_Avoid_: tour 2, phase 2
