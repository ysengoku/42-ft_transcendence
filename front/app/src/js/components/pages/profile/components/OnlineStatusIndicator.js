export class OnlineStatusIndicator extends HTMLElement {
  constructor() {
    super();
    this.isOnline = false;
    this.statusIndicator = null;
  }

  static get observedAttributes() {
    return ['online'];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'online') {
      this.isOnline = newValue === 'true';
      this.updateStatus();
    }
  }

  connectedCallback() {
    this.statusIndicator = document.createElement('span');
    this.statusIndicator.className = 'online-status-indicator mx-2';

    this.appendChild(this.statusIndicator);
    this.updateStatus();
  }

  updateStatus() {
    if (!this.statusIndicator) {
      return;
    }
    // console.log('Is Online: ', this.isOnline);
    this.statusIndicator.className = `online-status-indicator mx-2 ${this.isOnline ? 'online' : 'offline'}`;
  }

  setStatus(isOnline) {
    this.setAttribute('online', isOnline ? 'true' : 'false');
  }
}

customElements.define('profile-online-status', OnlineStatusIndicator);