import { showToastNotification } from '@utils';


const socketManager = (() => {
  class WebSocketManager {
    constructor() {
      this.url = 'wss://' + window.location.host + '/ws/events/';
      this.socket = null;
      this.socketOpen = false;
      this.activityTimeout = null;
      this.heartbeatInterval = null;
      this.HEARTBEAT_INTERVAL = 30000; // 30 seconds
      this.INACTIVITY_TIMEOUT = 120000; // 2 minutes
    }

    connect() {
      if (this.socketOpen) {
        return;
      }
      this.socket = new WebSocket(this.url);
      this.socketOpen = true;

      this.socket.onopen = (event) => {
        devLog('WebSocket opened:', event);
        this._startActivityMonitoring();
        this._sendInitialStatus();
      }
      this.socket.onmessage = (event) => this.handleAction(event);
      this.socket.onerror = (event) => console.error('WebSocket error:', event);
      this.socket.onclose = (event) => {
        devLog('WebSocket closed:', event);
        this._cleanupActivityMonitoring();
        setTimeout(() => this.reconnect(), 1000);
      };
    }
    _startActivityMonitoring() {
    // Surveillance d'activité utilisateur
    ['mousemove', 'keydown', 'scroll'].forEach(event => {
      window.addEventListener(event, this._resetInactivityTimer.bind(this), { passive: true });
    });

    // Heartbeat périodique
    this.heartbeatInterval = setInterval(() => {
      this._sendHeartbeat();
    }, this.HEARTBEAT_INTERVAL);

    // Déconnexion propre
    window.addEventListener('beforeunload', () => {
      this._sendOfflineStatus();
    });
  }

  _cleanupActivityMonitoring() {
    clearTimeout(this.activityTimeout);
    clearInterval(this.heartbeatInterval);
    ['mousemove', 'keydown', 'scroll'].forEach(event => {
      window.removeEventListener(event, this._resetInactivityTimer);
    });
  }

  _resetInactivityTimer() {
    clearTimeout(this.activityTimeout);
    this.activityTimeout = setTimeout(() => {
      this._sendHeartbeat();
    }, this.INACTIVITY_TIMEOUT);
  }

  _sendInitialStatus() {
    if (this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ action: 'user_online' }));
    }
  }

  _sendHeartbeat() {
    if (this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ action: 'heartbeat' }));
    }
  }

  _sendOfflineStatus() {
    navigator.sendBeacon(this.url, JSON.stringify({ action: 'user_offline' }));
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
        devErrorLog('Invalid JSON:', event.data);
        return;
      }
      if (!message.action) {
        devErrorLog('Missing action field:', message);
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
        // TODO: At click on toast, open a notifications list?
      },
      new_tournament: (data) => {
        devLog('New tournament received:', data);
        const notificationButton = document.querySelector('notifications-button');
        notificationButton?.querySelector('.notification-badge')?.classList.remove('d-none');
        showToastNotification(`${data.nickname} is calling all gunslingers to a new tournament.`);
        // TODO: Add link to the concerned tournament page?
      },
      new_friend: (data) => {
        devLog('New friend received:', data);
        const notificationButton = document.querySelector('notifications-button');
        notificationButton?.querySelector('.notification-badge')?.classList.remove('d-none');
        showToastNotification(`${data.nickname} just roped you in as a friend.`);
        // TODO: At click on toast, open a notifications list OR navigate to user's profile?
      },
      user_online: (data) => {
        if (!data?.username) {
            console.error('invalid data for user_online :', data);
            return;
        }
        devLog('User online:', data.username);
        this._updateUserStatus(data.username, true);
        // TODO
      },
      user_offline: (data) => {
        if (!data?.username) {
            console.error('invalid data for user_offline :', data);
            return;
        }
        devLog('User offline:', data.username);
        this._updateUserStatus(data.username, false);
        // TODO
      },
      user_status: (data) => {
        devLog('User status:', data);
        const status = data.status;
        updateUserStatus(data.username, status === 'online');
        // TODO
      },
      noMatchedListener: (action) => {
        devErrorLog('No listeners set for this action:', action);
        return;
      },
      // ICI
      activity_update: (data) => {
        console.log("Received activity update:", data);

        // Mettre à jour l'état en ligne de l'utilisateur dans l'interface utilisateur
        const userElement = document.querySelector(`[data-username="${data.username}"]`);
        if (userElement) {
            const statusIndicator = userElement.querySelector(".status-indicator");
            if (statusIndicator) {
                statusIndicator.textContent = "En ligne";
            }
        }
      },
      // LA
    };
    _updateUserStatus(username, isOnline) {
        if (!username) {
          console.error('Username not defined for the mise à jour du statut');
          return;
      }
      const userElements = document.querySelectorAll(`[data-username="${username}"]`);
      userElements.forEach(element => {
          const statusIndicator = element.querySelector('.status-indicator');
          if (!statusIndicator) {
              console.warn('Element .status-indicator non trouvé pour', username);
              return;
          }
          
          element.classList.toggle('online', isOnline);
          statusIndicator.textContent = isOnline ? 'En ligne' : 'Hors ligne';
      });
    }
  }
  return new WebSocketManager();
})();

export { socketManager };

