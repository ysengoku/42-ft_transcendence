

export class OnlineStatusIndicator extends HTMLElement {
  constructor() {
    super();
    this.isOnline = false;
    this.statusIndicator = null;
    this.userId = null;
    this.unsubscribeFunction = null;
  }

  static get observedAttributes() {
    return ['online', 'user-id'];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'online') {
      this.isOnline = newValue === 'true';
      this.updateStatus();
    } else if (name === 'user-id') {
      this.userId = newValue;
      this.setupStatusListener();
    }
  }

  connectedCallback() {
    this.statusIndicator = document.createElement('span');
    this.statusIndicator.className = 'online-status-indicator mx-2';

    this.appendChild(this.statusIndicator);
    
    // Récupérer user-id de l'attribut si disponible
    if (this.hasAttribute('user-id')) {
      this.userId = this.getAttribute('user-id');
    }
    
    this.setupStatusListener();
    this.updateStatus();
    
    // Assurer que la connexion WebSocket est établie
    onlineStatus.connect();
  }

  disconnectedCallback() {
    // Se désabonner lorsque l'élément est supprimé du DOM
    if (this.unsubscribeFunction) {
      this.unsubscribeFunction();
      this.unsubscribeFunction = null;
    }
  }

  setupStatusListener() {
    // Nettoyer tout abonnement existant
    if (this.unsubscribeFunction) {
      this.unsubscribeFunction();
    }
    
    // S'abonner aux mises à jour de statut pour l'utilisateur spécifié
    if (this.userId) {
      // Vérifier d'abord le statut actuel
      this.isOnline = onlineStatus.isUserOnline(this.userId);
      this.updateStatus();
      
      // S'abonner aux changements futurs
      this.unsubscribeFunction = onlineStatus.addStatusListener((userId, username, isOnline) => {
        if (userId === this.userId) {
          this.isOnline = isOnline;
          this.updateStatus();
        }
      });
    }
  }

  updateStatus() {
    if (!this.statusIndicator) {
      return;
    }
    this.statusIndicator.className = `online-status-indicator mx-2 ${this.isOnline ? 'online' : 'offline'}`;
  }

  setStatus(isOnline) {
    this.setAttribute('online', isOnline ? 'true' : 'false');
  }
}

customElements.define('profile-online-status', OnlineStatusIndicator);