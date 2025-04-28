
// Gestion centralisée des événements de statut en ligne

export function initProfileStatusListener() {
  // Dans le composant Profile
  document.addEventListener('onlineStatus', ({ detail }) => {
    const currentUser = document.querySelector('[data-current-user]')?.dataset.currentUser;
    if (detail.data.username === currentUser) {
      const statusIndicator = document.querySelector('#profile-status-indicator');
      if (statusIndicator) {
        statusIndicator.classList.toggle('online', detail.online);
        statusIndicator.textContent = detail.online ? 'En ligne' : 'Hors ligne';
      }
    }
  });
}

export function initChatListStatusListener() {
  // Dans la liste des chats
  document.addEventListener('onlineStatus', ({ detail }) => {
    const selector = `[data-username="${detail.data.username}"] .status-indicator`;
    document.querySelectorAll(selector).forEach(element => {
      element.classList.toggle('online', detail.online);
      element.textContent = detail.online ? '🟢' : '⚪';
    });
  });
}

export function initHeaderStatusListener() {
  // Dans l'en-tête du chat
  document.addEventListener('onlineStatus', ({ detail }) => {
    const headerStatus = document.querySelector('#chat-header-status');
    if (headerStatus?.dataset.username === detail.data.username) {
      headerStatus.textContent = detail.online ? 'En ligne' : 'Déconnecté';
    }
  });
}
