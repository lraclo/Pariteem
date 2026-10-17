import { defineConfig } from 'wxt';

// See https://wxt.dev/api/reference/wxt/interfaces/inlineconfig.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'Pariteem',
    description:
      'Trouve les Matchs de football dont les trois cotes dépassent un seuil, sur Winamax et Betclic.',
    permissions: ['storage', 'tabs'],
    action: { default_title: 'Pariteem' },
  },
});
