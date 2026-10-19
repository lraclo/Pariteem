# Distribution par un zip chargé en mode développeur

Chaque version est publiée sous forme de zip dans les Releases GitHub (workflow « Publier », à chaque tag `vX.Y.Z`) ; les Trésoriers le décompressent et le chargent une fois en mode développeur, sans Node ni build.

Hors Chrome Web Store (ADR 0002), Chrome sur Mac et Windows n'accepte une extension que de deux façons : chargée en mode développeur, ou imposée par une règle d'entreprise sur un navigateur géré. Aucun installeur (`.exe`, `.pkg`) ne peut déposer une extension hors Store. La voie « navigateur géré » par Chrome Enterprise Core (gratuit) a été essayée puis abandonnée : l'inscription refuse les adresses Gmail et exige un nom de domaine à soi, ce qui est disproportionné pour la Liste.

## Consequences

Pas de mise à jour automatique : pour une nouvelle version, le Trésorier remplace le contenu du dossier par le nouveau zip puis clique sur ⟳ dans `chrome://extensions`. Le dossier décompressé doit rester en place, Chrome le relit à chaque démarrage.
