export class FriendsButton extends HTMLElement {
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
    <div class="nav-link" id="navbar-friends-button" role="button" data-bs-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
			<button class="navbar-button btn">
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
