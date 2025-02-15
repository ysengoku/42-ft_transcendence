export class UserSearchButton extends HTMLElement {
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
	    <div class="nav-link" id="navbar-user-search" role="button" data-bs-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
        <button class="btn btn-secondary me-2 rounded-circle">
          <i class="bi bi-search"></i>
        </button>
	    </div>
	    <div class="dropdown-menu dropdown-menu-end" aria-labelledby="navbar-user-search">
		    <user-search></user-search>
		  </div>
      `;
  }
}
customElements.define('user-search-button', UserSearchButton);
