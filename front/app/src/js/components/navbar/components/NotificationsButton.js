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
    <div class="nav-link" id="navbar-notifications-button" role="button" data-bs-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
		  <button class="navbar-button btn me-2">
			  <i class="bi bi-bell"></i>
		  </button>
    </div>
    <div class="dropdown-menu dropdown-menu-end px-3">
      <notifications-list></notifications-list>
	  </div>
		`;

    // Add notifications functions
  }
}
customElements.define('notifications-button', NotificationsButton);
