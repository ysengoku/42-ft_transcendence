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
      this.addListeners();
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
      const matchedListener = this.listeners.get(message.action);
      if (!matchedListener) {
        console.error('No listeners set for this action:', message.action);
        return;
      }
      matchedListener.callback(message.data);
    }

    addListeners() {
      this.listeners.set('new_chat_message', this.handleNewChatMessage);
      this.listeners.set('like_message', this.handleLikeMessage);
      this.listeners.set('unlike_message', this.handleUnlikeMessage);
      this.listeners.set('game_invite', this.handleGameInvite);
      this.listeners.set('new_tournament', this.handleNewTournament);
      this.listeners.set('new_friend', this.handleNewFriend);
      this.listeners.set('user_online', this.handleUserOnline);
      this.listeners.set('user_offline', this.handleUserOffline);
    }

    handleNewChatMessage(data) {
      console.log('New chat message received:', data);
      console.log('Current path:', window.location.pathname);
      if (window.location.pathname === '/chat') {
        const chat = document.querySelector('chat-component');
        chat.receiveMessage(data);
        // Call the receiveMessage method of the Chat class
      } else {
        // Else, add notification badge to the Chat button of the navbar
      }
    }

    handleLikeMessage(data) {
      if (window.location.pathname !== '/chat') {
        return;
      }
    }

    handleUnlikeMessage(data) {
    }

    handleGameInvite(data) {
    }

    handleNewTournament(data) {
    }

    handleNewFriend(data) {

    }

    handleUserOnline(data) {

    }

    handleUserOffline(data) {

    }
  }
  return new WebSocketManager();
})();

export { socketManager };
