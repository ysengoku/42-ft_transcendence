import { showToastNotification } from '@utils';

/**
 * WebSocket endpoint URL paths for different features.
 * @readonly
 * @enum {string|function}
 */
const WS_PATH = {
  livechat: '/ws/events/',
  matchmaking: '/ws/matchmaking/',
  tournament: (id) => `/ws/tournaments/${id}`,
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
      devLog('WebSocket closed: ', this.name);
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
      this.configs = new Map();
      this.sockets = new Map();
    }

    /**
     * Add a WebSocket by name and initialize it with listeners.
     * @param {string} name - The name identifier for the socket.
     * @param {Object<string, Function>} listeners - The action handlers for this socket.
     */
    addSocket(name, listeners) {
      if (this.configs.has(name)) {
        devErrorLog('Socket type already registered:', name);
        return;
      }
      const path = WS_PATH[name];
      if (!path) {
        devErrorLog('Unknown socket path:', name);
        return;
      }
      this.configs.set(name, { path, listeners });
      // const ws = new WebSocketManager(name, path, listeners);
      // this.sockets.set(name, ws);
    }

    /**
     * Create a new WebSocket instance and connect it.
     * @param {string} name - The name of the socket to open.
     * @param {string|number} [id] - Optional identifier for the socket (e.g., tournament ID).
     */
    openSocket(name, id=null) {
      const config = this.configs.get(name);
      if (!config) {
        devErrorLog('Socket not registered:', name);
        return;
      }
      if (this.sockets.has(name)) {
        return;
      }
      const path = typeof config.path === 'function' ? config.path(id) : config.path;
      const listeners = config.listeners;
      const socket = new WebSocketManager(name, path, listeners);
      this.sockets.set(name, socket);
      socket.connect();
    }

    /**
     * Closes the WebSocket connection by name.
     * @param {string} name - The name of the socket to close.
     */
    closeSocket(name) {
      const socket = this.sockets.get(name);
      if (!socket) {
        return;
      }
      socket.close();
      socket.socketOpen = false;
      socket.socket = null;
      this.sockets.delete(name);
    }

    closeAllSockets() {
      this.sockets.forEach((socket) => {
        socket.close();
        socket.socketOpen = false;
        socket.socket = null;
        this.sockets.delete(socket.name);
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
    const notificationButton = document.querySelector('notifications-button');
    notificationButton?.querySelector('.notification-badge')?.classList.remove('d-none');
    showToastNotification(`${data.nickname} challenges you to a duel.`);
  },
  new_tournament: (data) => {
    const notificationButton = document.querySelector('notifications-button');
    notificationButton?.querySelector('.notification-badge')?.classList.remove('d-none');
    showToastNotification(`${data.nickname} is calling all gunslingers to a new tournament.`);
  },
  new_friend: (data) => {
    const notificationButton = document.querySelector('notifications-button');
    notificationButton?.querySelector('.notification-badge')?.classList.remove('d-none');
    showToastNotification(`${data.nickname} just roped you in as a friend.`);
  },
  user_online: (data) => {
    const customEvent = new CustomEvent('onlineStatus', {
      detail: { data, online: true },
      bubbles: true,
    });
    document.dispatchEvent(customEvent);
  },
  user_offline: (data) => {
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
    const customEvent = new CustomEvent('gameFound', { detail: data, bubbles: true });
    document.dispatchEvent(customEvent);
  },
});

// Socket registration for tournament
const tournamentEvents = [
  { action: 'registered', event: 'tournamentRegistered' },
  { action: 'register_fail', event: 'tournamentRegisterFail' },
  { action: 'tournament_cancelled', event: 'tournamentCancelled' },
  { action: 'new_registration', event: 'newTournamentRegistration' },
  { action: 'registration_cancelled', event: 'tournamentRegistrationCancelled' },
  { action: 'round_start', event: 'tournamentRoundStart' },
  { action: 'match_finished', event: 'tournamentMatchFinished' },
  { action: 'matchResult', event: 'tournamentMatchResult' },
  { action: 'round_end', event: 'tournamentRoundEnd' },
  { action: 'tournament_end', event: 'tournamentEnd' },
];

const tournamentListeners = tournamentEvents.reduce((acc, { action, event }) => {
  acc[action] = (data) => {
    const customEvent = new CustomEvent(event, { detail: data, bubbles: true });
    document.dispatchEvent(customEvent);
  };
  return acc;
}, {});

socketManager.addSocket('tournament', tournamentListeners);

export { socketManager };
