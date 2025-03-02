export class UserSearchButton extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    this.render();
  }

  render() {
    this.innerHTML = this.template() + this.style();
  }
  
  template() {
    return`
	    <div class="nav-link" id="navbar-user-search" role="button" data-bs-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
        <button class="navbar-button btn">
          <i class="bi bi-search"></i>
        </button>
	    </div>
	    <div class="dropdown-menu dropdown-menu-end" aria-labelledby="navbar-user-search">
		    <user-search></user-search>
		  </div>
    `;
  }

  style() {
    return `
      <style>
      .dropdown-menu {
        max-height: 75vh;
        overflow: auto;
      }
      </style>
    `;
  }
}
customElements.define('user-search-button', UserSearchButton);
