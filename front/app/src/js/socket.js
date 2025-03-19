const socketManager = (() => {
  class WebSocketManager {
    constructor() {
      this.url = 'wss://' + window.location.host + '/ws/events/';
      console.log('WebSocket URL:', this.url);
      this.socket = null;
      this.listeners = null;
      this.socketOpen = false;
    }

    init() {
      if (this.socketOpen) {
        return;
      }
      this.socket = new WebSocket(this.url);
      this.socketOpen = true;
      this.listeners = new Map();

      this.socket.onmessage = (event) => this.handleMessage(event);

      this.socket.onopen = (event) => console.log('WebSocket opened:', event);
      this.socket.onclose = (event) => console.log('WebSocket closed:', event);
      this.socket.onerror = (event) => console.error('WebSocket error:', event);
    }

    close() {
      this.socket.close();
      this.socketOpen = false;
    }

    handleMessage(event) {
      // console.log('Message received:', event.data);
      let message = null;
      try {
        message = JSON.parse(event.data);
      } catch (error) {
        // console.error('Invalid JSON:', event.data);
        return;
      }
      if (!message.action) {
        console.error('Message missing action field:', message);
        return;
      }
      const matchedListeners = this.listeners.get(message.action);
      if (!matchedListeners) {
        console.error('No listeners set for this action:', message.action);
        return;
      }
      matchedListeners.forEach((callback) => callback(message.data));
    }

    addListener(action, callback) {
      if (!this.listeners.has(action)) {
        this.listeners.set(action, []);
      }
      this.listeners.get(action).push(callback);
    }
  }
  return new WebSocketManager();
})();

export { socketManager };
