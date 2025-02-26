Code frontend pour gérer le statut en ligne

// users-online.js

class OnlineStatusManager {
  constructor() {
    this.socket = null;
    this.onlineUsers = new Map(); // userID -> status
    this.listeners = new Set();
    this.isConnected = false;
  }

  connect() {
    if (this.socket) {
      return;
    }

    // Récupérer le token JWT pour l'authentification (ajustez selon votre méthode d'auth)
    const token = localStorage.getItem('token');
    
    if (!token) {
      console.error('No authentication token found');
      return;
    }

    // Établir la connexion WebSocket
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${window.location.host}/ws/status/`;
    
    this.socket = new WebSocket(wsUrl);
    
    this.socket.onopen = () => {
      console.log('WebSocket status connection established');
      this.isConnected = true;
    };
    
    this.socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'status_update') {
          const { user_id, username, online } = data;
          this.onlineUsers.set(user_id, { username, online });
          
          // Notifier tous les écouteurs du changement de statut
          this.notifyListeners(user_id, username, online);
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };
    
    this.socket.onclose = () => {
      console.log('WebSocket status connection closed');
      this.isConnected = false;
      
      // Tentative de reconnexion après un délai
      setTimeout(() => {
        this.connect();
      }, 3000);
    };
    
    this.socket.onerror = (error) => {
      console.error('WebSocket status error:', error);
      this.socket.close();
    };
  }
  
  disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.isConnected = false;
  }
  
  isUserOnline(userId) {
    const user = this.onlineUsers.get(userId);
    return user ? user.online : false;
  }
  
  addStatusListener(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }
  
  notifyListeners(userId, username, online) {
    this.listeners.forEach(callback => {
      try {
        callback(userId, username, online);
      } catch (error) {
        console.error('Error in status listener callback:', error);
      }
    });
  }
}

// Singleton instance
const onlineStatus = new OnlineStatusManager();
export default onlineStatus;