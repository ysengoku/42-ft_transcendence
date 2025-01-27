export class NotificationsButton extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    this.render();
  }

  render() {
    this.innerHTML = `
			<button class="btn btn-secondary me-2 rounded-circle">
				<i class="bi bi-bell"></i>
			</button>
		`;

    // Add notifications functions
  }
}
customElements.define('notifications-button', NotificationsButton);
