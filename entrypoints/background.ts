import { bookmakerPourUrl } from '@/lib/bookmakers';

export default defineBackground(() => {
  browser.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
  browser.action.setBadgeBackgroundColor({ color: '#1a7f37' });

  function majBadge(tabId: number, url: string | undefined) {
    browser.action.setBadgeText({ tabId, text: bookmakerPourUrl(url) ? '✓' : '' });
  }

  browser.tabs.onUpdated.addListener((tabId, _changement, onglet) => majBadge(tabId, onglet.url));
  browser.tabs.onActivated.addListener(async ({ tabId }) => {
    majBadge(tabId, (await browser.tabs.get(tabId)).url);
  });
});
