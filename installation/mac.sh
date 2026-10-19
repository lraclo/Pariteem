#!/bin/bash
# Inscrit le Google Chrome de ce Mac à la console Chrome Enterprise Core de la Liste :
# Pariteem s'y installe, puis se met à jour toute seule. À lancer une fois dans le Terminal :
#   curl -fsSL https://raw.githubusercontent.com/lraclo/Pariteem/main/installation/mac.sh | sudo bash -s -- JETON
# Voir docs/distribution.md.
set -euo pipefail

JETON="${1:-}"
DOSSIER="/Library/Google/Chrome"
UTILISATEUR="${SUDO_USER:-}"

if [[ -z "$JETON" ]]; then
  echo "Il manque le jeton d'inscription à la fin de la commande. Recopiez la commande reçue en entier." >&2
  exit 1
fi
if [[ $EUID -ne 0 ]]; then
  echo "La commande doit être lancée avec sudo (recopiez-la en entier)." >&2
  exit 1
fi
if ! open -Ra "Google Chrome" 2>/dev/null; then
  echo "Google Chrome n'est pas installé. Installez-le depuis https://www.google.com/chrome/ puis relancez la commande." >&2
  exit 1
fi

# Chrome cherche ce fichier au démarrage et s'inscrit avec le jeton qu'il contient.
mkdir -p "$DOSSIER"
printf '%s' "$JETON" > "$DOSSIER/CloudManagementEnrollmentToken"
chmod 644 "$DOSSIER/CloudManagementEnrollmentToken"

if pgrep -x "Google Chrome" >/dev/null; then
  echo "Chrome va se fermer puis se rouvrir. Terminez ce que vous faites dans Chrome, puis appuyez sur Entrée."
  { read -r < /dev/tty; } 2>/dev/null || true
  pkill -TERM -x "Google Chrome" || true
  for _ in $(seq 30); do
    pgrep -x "Google Chrome" >/dev/null || break
    sleep 1
  done
fi

if [[ -n "$UTILISATEUR" ]]; then
  sudo -u "$UTILISATEUR" open -a "Google Chrome"
fi

echo
echo "C'est fait. Pariteem apparaît dans Chrome d'ici une à deux minutes (menu Extensions, l'icône en forme de pièce de puzzle)."
echo "Chrome affiche désormais « Géré par votre organisation » : c'est ce qui lui permet d'installer et de mettre à jour Pariteem."
