# Distribution par Chrome Enterprise Core

Les Trésoriers installent Pariteem en collant une commande dans le Terminal. Leur Chrome s'inscrit alors à la console Chrome Enterprise Core de la Liste (gratuite), qui lui impose l'extension ; Chrome vérifie ensuite toutes les quelques heures s'il existe une nouvelle version et l'installe seul. Pourquoi ce choix : [ADR 0003](adr/0003-distribution-par-chrome-enterprise-core.md).

```
tag vX.Y.Z ──► GitHub Actions ──► Release : pariteem.crx + update.xml
                                              ▲
Chrome du Trésorier ── inscrit à la console ──┘ (lit update.xml, télécharge le .crx)
```

## Valeurs fixes

| | |
|---|---|
| ID de l'extension | `lbffdcbgoopgjbikpeapbfkeghpkifce` |
| URL de mise à jour | `https://github.com/lraclo/Pariteem/releases/latest/download/update.xml` |
| Clé de signature | `~/.config/pariteem/cle-crx.pem` et secret GitHub `CLE_CRX` |

L'ID est dérivé de la clé de signature : **ne perdez pas la clé**. Gardez-en une copie dans un gestionnaire de mots de passe. Sans elle, une nouvelle clé donne un nouvel ID, qu'il faut alors déclarer à nouveau dans la console (les Trésoriers n'ont rien à refaire). `node scripts/empaqueter.mjs --id` affiche l'ID de la clé présente.

## Mise en place (une fois)

1. **Créer la console.** Sur [chromeenterprise.google](https://chromeenterprise.google/products/cloud-management/), « Commencer » avec un compte Google. Sans nom de domaine à vous, choisissez le domaine fourni par Google (`….deviceadmin.goog`).
2. **Créer le jeton d'inscription.** Dans [admin.google.com](https://admin.google.com) : *Navigateur Chrome › Navigateurs gérés* (*Chrome browser › Managed browsers*) › **Enregistrer** (*Enroll*, en haut) › accepter les conditions la première fois › *Copier le jeton d'inscription* (*Copy enrollment token*).
3. **Imposer Pariteem.** *Navigateur Chrome › Applications et extensions* (*Apps & extensions*) › onglet **Utilisateurs et navigateurs** (*Users & browsers*) › bouton jaune **+** › *Ajouter une application ou une extension Chrome par ID* (*Add Chrome app or extension by ID*) :
   - ID : `lbffdcbgoopgjbikpeapbfkeghpkifce`
   - menu déroulant : **À partir d'une URL personnalisée** (*From a custom URL*), URL : `https://github.com/lraclo/Pariteem/releases/latest/download/update.xml`
   - Règle d'installation (*Installation policy*) : **Forcer l'installation + épingler** (*Force install + pin*) si proposé, sinon **Forcer l'installation** (*Force install*), puis **Enregistrer**.
4. **Publier une première version** (section suivante) : tant qu'aucune Release n'existe, Chrome n'a rien à installer.

## Publier une version

```bash
npm version patch   # 0.1.0 → 0.1.1 : met à jour package.json, commit et tag v0.1.1
git push --follow-tags
```

Le workflow [Publier](../.github/workflows/publier.yml) lance les tests, construit le `.crx` signé et crée la Release. Les Chrome inscrits passent à la nouvelle version au plus tard quelques heures après (ou tout de suite avec **Mettre à jour** dans `chrome://extensions`, mode développeur activé).

Pour vérifier un paquet en local : `npm run crx` (produit `.output/pariteem.crx` et `.output/update.xml` avec la clé locale).

## Message à envoyer aux Trésoriers

Remplacez `JETON` par le jeton copié à l'étape 2. Le jeton n'est pas dans le dépôt : ne l'envoyez qu'aux membres de la Liste (quiconque l'a peut inscrire son Chrome à la console).

> **Installer Pariteem (une seule fois, 1 minute)**
>
> Il faut Google Chrome installé.
>
> **Sur Mac** : ouvrez l'app **Terminal** (Cmd + Espace, tapez « Terminal »), collez cette ligne puis Entrée :
>
> ```
> curl -fsSL https://raw.githubusercontent.com/lraclo/Pariteem/main/installation/mac.sh | sudo bash -s -- JETON
> ```
>
> Le Terminal demande le mot de passe de votre Mac : tapez-le (rien ne s'affiche, c'est normal) puis Entrée.
>
> **Sur Windows** : ouvrez **PowerShell** (touche Windows, tapez « PowerShell »), collez cette ligne puis Entrée, et acceptez la demande d'autorisation :
>
> ```
> & ([scriptblock]::Create((irm https://raw.githubusercontent.com/lraclo/Pariteem/main/installation/windows.ps1))) JETON
> ```
>
> Chrome redémarre, puis Pariteem apparaît d'ici une à deux minutes dans le menu Extensions (la pièce de puzzle). Les mises à jour se font ensuite toutes seules.
>
> Chrome affichera « Géré par votre organisation » : la console de la Liste voit la version de Chrome et les extensions installées sur ce navigateur, pas votre historique ni vos mots de passe.

## Si l'extension n'apparaît pas

- `chrome://management` doit indiquer que le navigateur est géré. Sinon, le jeton n'a pas été lu : quitter Chrome complètement (Cmd + Q) et le rouvrir.
- Le navigateur doit apparaître dans la console, *Navigateur Chrome › Navigateurs gérés*.
- `chrome://policy` › **Actualiser les règles** : `ExtensionInstallForcelist` (ou `ExtensionSettings`) doit contenir l'ID de Pariteem.
- Une version doit exister dans les [Releases](https://github.com/lraclo/Pariteem/releases) avec `pariteem.crx` et `update.xml`.

## Désinscrire un navigateur

Dans la console, *Navigateurs gérés* › sélectionner le navigateur › **Supprimer** : Chrome n'est plus géré et Pariteem est désinstallée. Sur Mac, supprimer aussi `/Library/Google/Chrome/CloudManagementEnrollmentToken` pour qu'il ne se réinscrive pas ; sur Windows, la valeur `CloudManagementEnrollmentToken` de `HKLM\SOFTWARE\Policies\Google\Chrome`.
