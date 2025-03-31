import { showToastNotification } from '@utils';

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

      this.socket.onopen = (event) => devLog('WebSocket opened:', event);
      this.socket.onmessage = (event) => this.handleAction(event);
      this.socket.onerror = (event) => console.error('WebSocket error:', event);
      this.socket.onclose = (event) => {
        devLog('WebSocket closed:', event);
        setTimeout(() => this.reconnect(), 1000);
      };
    }

    reconnect() {
      if (!this.socketOpen) {
        return;
      }
      devLog('Reconnecting to WebSocket...');
      this.socket = new WebSocket(this.url);
      this.socket.onopen = (event) => devLog('WebSocket opened:', event);
      this.socket.onmessage = (event) => this.handleAction(event);
      this.socket.onerror = (event) => console.error('WebSocket error:', event);
      this.socket.onclose = (event) => {
        devLog('WebSocket closed:', event);
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
      devLog('Message received via WebSocket:', event.data);
      let message = null;
      try {
        message = JSON.parse(event.data);
      } catch (error) {
        devLogError('Invalid JSON:', event.data);
        return;
      }
      if (!message.action) {
        devLogError('Missing action field:', message);
        return;
      }
      const matchedListener = this.listeners[message.action];
      if (matchedListener) {
        matchedListener(message.data);
      } else {
        this.listeners.noMatchedListener(message.action);
      }
    }

    listeners = {
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
        const customEvent =
          new CustomEvent('toggleLikeChatMessage', { detail: { data, is_liked: true }, bubbles: true });
        document.dispatchEvent(customEvent);
      },
      unlike_message: (data) => {
        devLog('Message unliked:', data);
        if (window.location.pathname !== '/chat') {
          return;
        }
        const customEvent =
          new CustomEvent('toggleLikeChatMessage', { detail: { data, is_liked: false }, bubbles: true });
        document.dispatchEvent(customEvent);
      },
      game_invite: (data) => {
        devLog('Game invite received:', data);
        const notificationButton = document.querySelector('notifications-button');
        notificationButton?.querySelector('.notification-badge')?.classList.remove('d-none');
        // TODO
      },
      new_tournament: (data) => {
        devLog('New tournament received:', data);
        const notificationButton = document.querySelector('notifications-button');
        notificationButton?.querySelector('.notification-badge')?.classList.remove('d-none');
        // TODO
      },
      new_friend: (data) => {
        devLog('New friend received:', data);
        const notificationButton = document.querySelector('notifications-button');
        notificationButton?.querySelector('.notification-badge')?.classList.remove('d-none');
        // TODO
      },
      user_online: (data) => {
        devLog('User online:', data);
        // TODO
      },
      user_offline: (data) => {
        devLog('User offline:', data);
        // TODO
      },
      noMatchedListener: (action) => {
        devLogError('No listeners set for this action:', action);
        return;
      },
    };
  }
  return new WebSocketManager();
})();

export { socketManager };
