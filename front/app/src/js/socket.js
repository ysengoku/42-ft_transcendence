import { showToastNotification } from '@utils';

/**
 * WebSocket endpoint URL paths for different features.
 * @readonly
 * @enum {string}
 */
const WS_PATH = {
  livechat: '/ws/events/',
  matchmaking: '/ws/matchmaking/',
};

/**
 * Manager for handling a single WebSocket connection.
 */
class WebSocketManager {
  constructor(name, path, listeners = {}) {
    // path example format: '/ws/events/'
    this.name = name;
    this.url = 'wss://' + window.location.host + path;
    this.listeners = listeners;
    this.socket = null;
    this.socketOpen = false;
  }

  connect() {
    if (this.socketOpen) {
      return;
    }
    this.socket = new WebSocket(this.url);
    this.socketOpen = true;

    this.socket.onopen = (event) => devLog('WebSocket opened to ', this.url, event);
    this.socket.onmessage = (event) => this.handleAction(event);
    this.socket.onerror = (event) => console.error('WebSocket error: ', this.name, event);
    this.socket.onclose = (event) => {
      devLog('WebSocket closed: ', this.name, event);
      if (event.code == 3000)
        return;
      setTimeout(() => this.reconnect(), 1000);
    };
  }

  reconnect() {
    if (!this.socketOpen) {
      return;
    }
    devLog('Reconnecting to WebSocket to ', this.url);
    this.socket = new WebSocket(this.url);
    this.socket.onopen = (event) => devLog('WebSocket opened to ', this.url, event);
    this.socket.onmessage = (event) => this.handleAction(event);
    this.socket.onerror = (event) => console.error('WebSocket error (', this.name, ') ', event);
    this.socket.onclose = (event) => {
      devLog('WebSocket closed (', this.name, ') ', event);
      setTimeout(() => this.reconnect(), 1000);
    };
  }

  close() {
    if (!this.socketOpen) {
      return;
    }
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.close();
      this.socketOpen = false;
    }
  }

  /**
   * Handle incoming WebSocket messages and dispatches them to the correct listener.
   * @param {MessageEvent} event - The message event received from the WebSocket.
   */
  handleAction(event) {
    devLog('Message received via WebSocket:', event.data);
    let message = null;
    try {
      message = JSON.parse(event.data);
    } catch (error) {
      devErrorLog('Invalid JSON:', event.data);
      return;
    }
    if (!message.action) {
      devErrorLog('Missing action field:', message);
      return;
    }
    const matchedListener = this.listeners[message.action];
    if (matchedListener) {
      message.data ?
        matchedListener(message.data) :
        matchedListener(message);
    } else {
      devErrorLog('No listeners set for this action:', message.action);
      return;
    }
  }
}

/**
 * Singleton manager for all WebSocket connections.
 * Provide methods to add, open, close, and send messages over named sockets.
 */
const socketManager = (() => {
  class SocketsManager {
    constructor() {
      this.sockets = new Map();
    }

    /**
     * Add a WebSocket by name and initialize it with listeners.
     * @param {string} name - The name identifier for the socket.
     * @param {Object<string, Function>} listeners - The action handlers for this socket.
     */
    addSocket(name, listeners) {
      if (this.sockets.has(name)) {
        devErrorLog('Socket already exists:', name);
        return;
      }
      const path = WS_PATH[name];
      const ws = new WebSocketManager(name, path, listeners);
      this.sockets.set(name, ws);
    }

    /**
     * Opens the WebSocket connection by name.
     * @param {string} name - The name of the socket to open.
     */
    openSocket(name) {
      const socket = this.sockets.get(name);
      if (!socket) {
        devErrorLog('Socket not found:', name);
        return;
      }
      socket.connect();
    }

    /**
     * Closes the WebSocket connection by name.
     * @param {string} name - The name of the socket to close.
     */
    closeSocket(name) {
      const socket = this.sockets.get(name);
      if (!socket) {
        devErrorLog('Socket not found:', name);
        return;
      }
      socket.close();
      socket.socketOpen = false;
      socket.socket = null;
    }

    closeAllSockets() {
      this.sockets.forEach((socket) => {
        socket.close();
        socket.socketOpen = false;
        socket.socket = null;
      });
    }

    /**
     * Sends a message through a WebSocket by name.
     * @param {string} name - The name of the socket to send the message on.
     * @param {Object} message - The message object to send.
     */
    sendMessage(name, message) {
      const socket = this.sockets.get(name);
      if (!socket) {
        devErrorLog('Socket not found:', name);
        return;
      }
      devLog('Sending message via WebSocket:', message);
      socket.socket.send(JSON.stringify(message));
    }
  }
  return new SocketsManager();
})();

// Socket registration for livechat module including Chat, Notifications, and Onlie status
socketManager.addSocket('livechat', {
  new_message: (data) => {
    devLog('New chat message:', data);
    if (window.location.pathname === '/chat') {
      const customEvent = new CustomEvent('newChatMessage', { detail: data, bubbles: true });
      document.dispatchEvent(customEvent);
    } else {
      const chatButton = document.querySelector('chat-button');
      chatButton?.querySelector('.notification-badge')?.classList.remove('d-none');
      showToastNotification('New message just rode in.');
    }
    return;
  },
  like_message: (data) => {
    devLog('Message liked:', data);
    if (window.location.pathname !== '/chat') {
      return;
    }
    const customEvent = new CustomEvent('toggleLikeChatMessage', {
      detail: { data, is_liked: true },
      bubbles: true,
    });
    document.dispatchEvent(customEvent);
  },
  unlike_message: (data) => {
    devLog('Message unliked:', data);
    if (window.location.pathname !== '/chat') {
      return;
    }
    const customEvent = new CustomEvent('toggleLikeChatMessage', {
      detail: { data, is_liked: false },
      bubbles: true,
    });
    document.dispatchEvent(customEvent);
  },
  game_invite: (data) => {
    devLog('Game invite received:', data);
    const notificationButton = document.querySelector('notifications-button');
    notificationButton?.querySelector('.notification-badge')?.classList.remove('d-none');
    showToastNotification(`${data.nickname} challenges you to a duel.`);
  },
  new_tournament: (data) => {
    devLog('New tournament received:', data);
    const notificationButton = document.querySelector('notifications-button');
    notificationButton?.querySelector('.notification-badge')?.classList.remove('d-none');
    showToastNotification(`${data.nickname} is calling all gunslingers to a new tournament.`);
  },
  new_friend: (data) => {
    devLog('New friend received:', data);
    const notificationButton = document.querySelector('notifications-button');
    notificationButton?.querySelector('.notification-badge')?.classList.remove('d-none');
    showToastNotification(`${data.nickname} just roped you in as a friend.`);
  },
  user_online: (data) => {
    devLog('User online:', data);
    const customEvent = new CustomEvent('onlineStatus', {
      detail: { data, online: true },
      bubbles: true,
    });
    document.dispatchEvent(customEvent);
  },
  user_offline: (data) => {
    devLog('User offline:', data);
    const customEvent = new CustomEvent('onlineStatus', {
      detail: { data, online: false },
      bubbles: true,
    });
    document.dispatchEvent(customEvent);
  },
});

// Socket registration for matchmaking
socketManager.addSocket('matchmaking', {
  game_found: (data) => {
    devLog('Game found:', data);
    const customEvent = new CustomEvent('gameFound', { detail: data, bubbles: true });
    document.dispatchEvent(customEvent);
  },
});

export { socketManager };
