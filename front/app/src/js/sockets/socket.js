import { showToastNotification, TOAST_TYPES } from '@utils';

/**
 * WebSocket endpoint URL paths for different features.
 * @readonly
 * @enum {string|function}
 */
const WS_PATH = {
  livechat: '/ws/events/',
  matchmaking: (options) => (options === null ? '/ws/matchmaking/' : `/ws/matchmaking/${options}`),
  tournament: (id) => `/ws/tournament/${id}`,
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

    const timestamp = new Date().getTime();
    const randomUUID = crypto.randomUUID();
    this.instanceId = `${timestamp}-${randomUUID}`;
    log.info(`WebSocketManager created for ${this.name} with instance ID: ${this.instanceId}`);
  }

  connect() {
    if (this.socketOpen) {
      return;
    }
    this.socket = new WebSocket(this.url);
    this.socketOpen = true;

    this.socket.onopen = (event) => log.info('WebSocket opened to ', this.url, event);
    this.socket.onmessage = (event) => this.handleAction(event);
    this.socket.onerror = (event) => console.error('WebSocket error: ', this.name, event);
    this.socket.onclose = (event) => {
      log.info('WebSocket closed: ', this.name, event, event.code);
      if (event.code >= 3000) {
        const customEvent = new CustomEvent('websocket-close', {
          detail: { name: this.name, code: event.code },
          bubbles: true,
        });
        document.dispatchEvent(customEvent);
        log.info(`WebSocket (${this.name}) closed intentionally by server with code ${event.code}`);
        this.socketOpen = false;
        return;
      }
      if (event.code === 1006 || event.code === 1011) {
        showToastNotification('Connection to server lost.', TOAST_TYPES.ERROR);
        log.error(`WebSocket (${this.name}) closed. Server error.`);
        this.socketOpen = false;
        return;
      }
      setTimeout(() => this.reconnect(), 1000);
    };
  }

  reconnect() {
    if (!this.socketOpen) {
      return;
    }
    log.info(`WebSocket (${this.name}) closed unexpectedly. Attempting to reconnect...`);
    this.socket = new WebSocket(this.url);
    this.socket.onopen = (event) => log.info('WebSocket opened to ', this.url, event);
    this.socket.onmessage = (event) => this.handleAction(event);
    this.socket.onerror = (event) => console.error('WebSocket error (', this.name, ') ', event);
    this.socket.onclose = (event) => {
      log.info('WebSocket closed (', this.name, ') ', event);
      if (event.code >= 3000) {
        const customEvent = new CustomEvent('websocket-close', {
          detail: { name: this.name, code: event.code },
          bubbles: true,
        });
        document.dispatchEvent(customEvent);
        log.info(`WebSocket (${this.name}) closed intentionally by server with code ${event.code}`);
        this.socketOpen = false;
        return;
      }
      if (event.code === 1006 || event.code === 1011) {
        showToastNotification('Connection to server lost.', TOAST_TYPES.ERROR);
        log.error(`WebSocket (${this.name}) closed. Server error.`);
        this.socketOpen = false;
        return;
      }
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
    log.info('Message received via WebSocket:', event.data);
    let message = null;
    try {
      message = JSON.parse(event.data);
    } catch (error) {
      log.error('Invalid JSON:', error);
      return;
    }
    if (!message.action) {
      log.error('Missing action field:', message);
      return;
    }
    const matchedListener = this.listeners[message.action];
    if (matchedListener) {
      message.data ? matchedListener(message.data) : matchedListener(message);
    } else {
      log.error('No listeners set for this action:', message.action);
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
        log.error('Socket type already registered:', name);
        return;
      }
      const path = WS_PATH[name];
      if (!path) {
        log.error('Unknown socket path:', name);
        return;
      }
      this.configs.set(name, { path, listeners });
    }

    /**
     * Create a new WebSocket instance and connect it.
     * @param {string} name - The name of the socket to open.
     * @param {string|number} [id] - Optional identifier for the socket (e.g., tournament ID).
     */
    openSocket(name, id = null) {
      const config = this.configs.get(name);
      if (!config) {
        log.error('Socket not registered:', name);
        return;
      }
      if (this.sockets.has(name) && this.sockets.get(name).socketOpen) {
        log.info('Socket already open:', name);
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
        log.error('Socket not found:', name);
        return;
      }
      if (socket.socket.readyState !== WebSocket.OPEN) {
        log.error('WebSocket is not open:', name);
        return;
      }
      log.info('Sending message via WebSocket:', message);
      socket.socket.send(JSON.stringify(message));
    }

    /**
     * Get the client instance id
     * @param {string} name - The name of the socket.
     * @returns {string} - A unique identifier for the client instance.
     */
    getClientInstanceId(name) {
      const socket = this.sockets.get(name);
      if (!socket) {
        log.error('Socket not found:', name);
        return null;
      }
      return socket.instanceId;
    }
  }
  return new SocketsManager();
})();

export { socketManager };
