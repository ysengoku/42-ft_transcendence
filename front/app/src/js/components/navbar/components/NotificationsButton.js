export class NotificationsButton extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    this.render();
  }

  render() {
    this.innerHTML = this.template();
  }

  template() {
    return `
		<button class="navbar-button btn me-2">
			<i class="bi bi-bell"></i>
		</button>
		`;

    // Add notifications functions
  }
}
customElements.define('notifications-button', NotificationsButton);
