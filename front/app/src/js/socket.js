const socketManager = (() => {
  class WebSocketManager {
    constructor(url) {
      if (!url) {
        throw new Error('URL is required to create a WebSocketManager');
      }
      this.socket = new WebSocket(url);
      this.listeners = new Map();

      this.socket.onmessage = (event) => this.handleMessage(event);

      this.socket.onopen = (event) => console.log('WebSocket opened:', event);
      this.socket.onclose = (event) => console.log('WebSocket closed:', event);
      this.socket.onerror = (event) => console.error('WebSocket error:', event);
    }

    handleMessage(event) {
      console.log('Message received:', event.data);
      let message = null;
      try {
        message = JSON.parse(event.data);
      } catch (error) {
        console.error('Invalid JSON:', event.data);
        return;
      }
      if (!message.type) {
        console.error('Message missing type field:', message);
      }
      const matchedListeners = this.listeners.get(message.type);
      if (!matchedListeners) {
        console.error('No listeners set for message type:', message.type);
        return;
      }
      matchedListeners.forEach((callback) => callback(message.data));
    }

    addListener(type, callback) {
      if (!this.listeners.has(type)) {
        this.listeners.set(type, []);
      }
      this.listeners.get(type).push(callback);
    }
  }
  // TODO: Change this URL to our WebSocket server
  return new WebSocketManager('https://echo.websocket.org/');
})();

export { socketManager };
