import { defineConfig } from 'wxt';

// See https://wxt.dev/api/reference/wxt/interfaces/inlineconfig.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'Pariteem',
    description:
      'Trouve les Matchs de football dont les trois cotes dépassent un seuil, sur Winamax et Betclic.',
    permissions: ['sidePanel', 'storage', 'tabs', 'contextMenus'],
    action: { default_title: 'Pariteem' },
    // Pour Arc, qui n'affiche pas les panneaux latéraux : ouvrir Pariteem dans une fenêtre.
    commands: {
      'ouvrir-fenetre': {
        suggested_key: { default: 'Alt+Shift+P' },
        description: 'Ouvrir Pariteem dans une fenêtre',
      },
    },
  },
});
