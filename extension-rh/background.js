/**
 * RH Auto-Apply v2.0 — Background Service Worker
 *
 * Gère les menus contextuels (clic droit) pour l'apprentissage des sélecteurs CSS
 * sur tout nouveau site d'emploi.
 */

const MENU_ITEMS = [
  { id: 'applyButton', title: '📩 Enseigner — Bouton "Postuler"' },
  { id: 'jobTitle',    title: '📝 Enseigner — Titre du poste' },
  { id: 'company',     title: '🏢 Enseigner — Nom de l\'entreprise' },
  { id: 'location',    title: '📍 Enseigner — Localisation' },
  { id: 'salary',      title: '💰 Enseigner — Salaire' },
  { id: 'description', title: '📄 Enseigner — Description du poste' },
];

function createContextMenus() {
  // Supprime les anciens menus pour éviter les doublons au rechargement
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: 'autoapply-root',
      title: '🤖 AutoApply — Enseigner ce site',
      contexts: ['all'],
    });

    MENU_ITEMS.forEach(item => {
      chrome.contextMenus.create({
        id: item.id,
        parentId: 'autoapply-root',
        title: item.title,
        contexts: ['all'],
      });
    });

    chrome.contextMenus.create({
      id: 'sep1',
      parentId: 'autoapply-root',
      type: 'separator',
      contexts: ['all'],
    });

    chrome.contextMenus.create({
      id: 'resetSite',
      parentId: 'autoapply-root',
      title: '🗑️ Réinitialiser la config de ce site',
      contexts: ['all'],
    });
  });
}

chrome.runtime.onInstalled.addListener(() => {
  console.log('[AutoApply] Extension installée v2.0');
  createContextMenus();
});

// Recréer les menus si le service worker redémarre
chrome.runtime.onStartup.addListener(createContextMenus);

// Quand l'utilisateur clique sur un item du menu contextuel,
// on envoie un message au content script de l'onglet actif
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (!tab?.id) return;

  const validTypes = MENU_ITEMS.map(i => i.id).concat(['resetSite']);
  if (!validTypes.includes(info.menuItemId)) return;

  chrome.tabs.sendMessage(
    tab.id,
    { action: 'teachElement', type: info.menuItemId },
    response => {
      if (chrome.runtime.lastError) {
        console.warn('[AutoApply] Message non livré:', chrome.runtime.lastError.message);
      }
    }
  );
});
