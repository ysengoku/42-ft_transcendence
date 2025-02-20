export class FriendsButton extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    this.render();
  }

  render() {
    this.innerHTML = `
      <style>
        .dropdown-menu {
          max-height: 75vh;
          overflow: auto;
       }
      </style>
      <div class="nav-link" id="navbar-friends-button" role="button" data-bs-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
			  <button class="btn btn-secondary me-2 rounded-circle">
				  <i class="bi bi-people"></i>
			  </button>
      </div>
	    <div class="dropdown-menu dropdown-menu-end px-3">
        <friends-list></friends-list>
	    </div>
		`;
  }
}
customElements.define('friends-button', FriendsButton);
