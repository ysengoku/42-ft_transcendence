const socketManager = (() => {
  class WebSocketManager {
    constructor() {
      this.url = 'wss://' + window.location.host + '/ws/events/';
      this.socket = null;
      this.listeners = new Map();
      this.socketOpen = false;
    }

    connect() {
      if (this.socketOpen) {
        return;
      }
      this.socket = new WebSocket(this.url);
      this.socketOpen = true;

      this.socket.onopen = (event) => console.log('WebSocket opened:', event);
      this.socket.onmessage = (event) => this.handleAction(event);
      this.socket.onerror = (event) => console.error('WebSocket error:', event);
      this.socket.onclose = (event) => {
        console.log('WebSocket closed:', event);
        setTimeout(() => this.reconnect(), 1000);
      };
    }

    reconnect() {
      if (!this.socketOpen) {
        return;
      }
      console.log('Reconnecting to WebSocket...');
      this.socket = new WebSocket(this.url);
      this.socket.onopen = (event) => console.log('WebSocket opened:', event);
      this.socket.onmessage = (event) => this.handleAction(event);
      this.socket.onerror = (event) => console.error('WebSocket error:', event);
      this.socket.onclose = (event) => {
        console.log('WebSocket closed:', event);
        setTimeout(() => this.reconnect(), 1000);
      };
    }

    close() {
      if (!this.socketOpen) {
        return;
      }
      this.socket.close();
      this.socketOpen = false;
    }

    handleAction(event) {
      // console.log('Message received:', event.data);
      let message = null;
      try {
        message = JSON.parse(event.data);
      } catch (error) {
        console.error('Invalid JSON:', event.data);
        return;
      }
      if (!message.action) {
        console.error('Missing action field:', message);
        return;
      }
      const matchedListener = this.listeners.get(message.action);
      if (!matchedListener) {
        console.error('No listeners set for this action:', message.action);
        return;
      }
      matchedListener.callback(message.data);
    }

    addListener(action, callback) {
      if (!this.listeners.has(action)) {
        this.listeners.set(action, []);
      }
      this.listeners.get(action).push(callback);
    }

    handleNewMessage(data) {
      // If window.location.pathname is /chat, call the receiveMessage method of the Chat class
      // Else, add notification badge to the Chat button of the navbar 
    }
  }
  return new WebSocketManager();
})();

export { socketManager };
