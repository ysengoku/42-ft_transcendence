const socketManager = (() => {
  class WebSocketManager {
    constructor() {
      this.url = 'wss://' + window.location.host + '/ws/events/';
      this.socket = null;
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
      console.log('Message received:', event.data);
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
      const matchedListener = this.listeners[message.action] || this.listeners.noMatchedListener;
      matchedListener(message.data);
    }

    listeners = {
      new_message: (data) => {
        console.log('New chat message:', data);
        if (window.location.pathname === '/chat') {
          const customEvent = new CustomEvent('newChatMessage', { detail: data, bubbles: true });
          document.dispatchEvent(customEvent);
        } else {
          const chatButton = document.querySelector('chat-button');
          chatButton?.querySelector('.notification-badge')?.classList.remove('d-none');
        }
        return;
      },
      like_message: (data) => {
        console.log('Message liked:', data);
        if (window.location.pathname !== '/chat') {
          return;
        }
        // TODO
      },
      unlike_message: (data) => {
        console.log('Message liked:', data);
        if (window.location.pathname !== '/chat') {
          return;
        }
        // TODO
      },
      game_invite: (data) => {
        console.log('Game invite received:', data);
        const notificationButton = document.querySelector('notifications-button');
        notificationButton?.querySelector('.notification-badge')?.classList.remove('d-none');
        // TODO
      },
      new_tournament: (data) => {
        console.log('New tournament received:', data);
        const notificationButton = document.querySelector('notifications-button');
        notificationButton?.querySelector('.notification-badge')?.classList.remove('d-none');
        // TODO
      },
      new_friend: (data) => {
        console.log('New friend received:', data);
        const notificationButton = document.querySelector('notifications-button');
        notificationButton?.querySelector('.notification-badge')?.classList.remove('d-none');
        // TODO
      },
      user_online: (data) => {
        console.log('User online:', data);
        // TODO
      },
      user_offline: (data) => {
        console.log('User offline:', data);
        // TODO
      },
      noMatchedListener: () => {
        console.error('No listeners set for this action:', message.action);
        return;
      },
    };
  }
  return new WebSocketManager();
})();

export { socketManager };
