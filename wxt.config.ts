import { defineConfig } from 'wxt';

// See https://wxt.dev/api/reference/wxt/interfaces/inlineconfig.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'Pariteem',
    description:
      'Trouve les Matchs de football dont les trois cotes dépassent un seuil, sur Winamax et Betclic.',
    permissions: ['sidePanel', 'storage', 'tabs'],
    action: { default_title: 'Pariteem' },
    // Chrome y cherche les nouvelles versions de l'extension installée par Chrome Enterprise Core.
    update_url: 'https://github.com/lraclo/Pariteem/releases/latest/download/update.xml',
  },
});
