// users-online.js

class OnlineStatusManager {
  constructor() {
    this.socket = null;
    this.onlineUsers = new Map(); // userID -> status
    this.listeners = new Set();
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 3000; // 3 seconds
  }

  connect() {
    if (this.socket && this.isConnected) {
      console.log('WebSocket connection already established');
      return;
    }

    // Établir la connexion WebSocket
    const wsUrl = `wss://${window.location.host}/ws/online/`;
    
    this.socket = new WebSocket(wsUrl);
    
    this.socket.onopen = () => {
      console.log('WebSocket online status connection established');
      this.isConnected = true;
      this.reconnectAttempts = 0;
      console.log('WebSocket online status connection established');
      
      // Initialiser la liste des utilisateurs en ligne au démarrage
      this.fetchInitialOnlineUsers();
    };
    
    this.socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'status_update') {
          const { user_id, username, online } = data;
          
          // Mettre à jour le statut de l'utilisateur
          if (online) {
            this.onlineUsers.set(user_id, { username, online });
          } else {
            this.onlineUsers.delete(user_id);
          }
          
          // Notifier tous les écouteurs du changement de statut
          this.notifyListeners(user_id, username, online);
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };
    
    this.socket.onclose = (event) => {
      console.log(`WebSocket connection closed: ${event.code} ${event.reason}`);
      this.isConnected = false;
      
      // Tentative de reconnexion avec backoff exponentiel
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts);
        console.log(`Attempting to reconnect in ${delay}ms...`);
        setTimeout(() => {
          this.reconnectAttempts++;
          this.connect();
        }, delay);
      } else {
        console.error('Maximum reconnection attempts reached');
      }
    };
    
    this.socket.onerror = (error) => {
      console.error('❌ WebSocket connection error:', error);
      // Vous pouvez ajouter plus de détails pour aider au débogage
      console.log('Current location:', window.location.href);
      console.log('WebSocket URL attempted:', wsUrl);
    };
    
  }
  
  disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.isConnected = false;
    this.onlineUsers.clear();
  }
  
  async fetchInitialOnlineUsers() {
    try {
      const response = await fetch('/api/users/online-users/');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const userIds = await response.json();
      
      // Récupérer les informations des utilisateurs si nécessaire
      for (const userId of userIds) {
        this.onlineUsers.set(userId, { username: userId, online: true });
      }
      
      console.log(`Loaded ${userIds.length} online users`);
      
      // Notifier les écouteurs que les données initiales sont chargées
      this.notifyListeners(null, null, null, true);
    } catch (error) {
      console.error('Error fetching initial online users:', error);
    }
  }
  
  isUserOnline(userId) {
    return this.onlineUsers.has(userId);
  }
  
  getAllOnlineUsers() {
    return Array.from(this.onlineUsers.entries()).map(([userId, data]) => ({
      userId,
      username: data.username,
      online: true
    }));
  }
  
  addStatusListener(callback) {
    this.listeners.add(callback);
    // Retourner une fonction pour supprimer l'écouteur
    return () => this.listeners.delete(callback);
  }
  
  notifyListeners(userId, username, online, isInitialLoad = false) {
    this.listeners.forEach(callback => {
      try {
        if (isInitialLoad) {
          // Notifier que les données initiales sont chargées
          callback(null, null, null, true);
        } else {
          // Notifier d'un changement de statut spécifique
          callback(userId, username, online, false);
        }
      } catch (error) {
        console.error('Error in status listener callback:', error);
      }
    });
  }
}

// Singleton instance
const onlineStatus = new OnlineStatusManager();
export default onlineStatus;