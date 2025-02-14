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
      <div class="nav-link" id="navbarFriendsButton" role="button" data-bs-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
			  <button class="btn btn-secondary me-2 rounded-circle" id="friendsButton">
				  <i class="bi bi-people"></i>
			  </button>
      </div>
	    <div class="dropdown-menu dropdown-menu-end" aria-labelledby="navbarFriendsButton px-5">
        <friends-list></friends-list>
	    </div>
		`;
  }
}
customElements.define('friends-button', FriendsButton);
