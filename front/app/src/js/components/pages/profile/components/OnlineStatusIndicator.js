export class OnlineStatusIndicator extends HTMLElement {
  #state = {
    isOnline: false,
  };

  constructor() {
    super();
  }

  setStatus(isOnline) {
    this.#state.isOnline = isOnline;
    this.render();
  }

  render() {
    this.innerHTML = this.template();
    this.statusIndicator = this.querySelector('.online-status-indicator');
    this.updateStatus();
  }

  updateStatus() {
    this.#state.isOnline ?
      this.statusIndicator.classList.add('online') :
      this.statusIndicator.classList.remove('online');
  }

  template() {
    return `
    <div class="mt-2">
      <span class="online-status-indicator mx-2"></span>
    </div>
    `;
  }
}

customElements.define('profile-online-status', OnlineStatusIndicator);
