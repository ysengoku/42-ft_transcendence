export class Navbar extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    this.render();
  }

  render() {
    this.innerHTML = `
			<nav class="navbar navbar-expand navbar-dark bg-dark px-3">
				<navbar-brand-component></navbar-brand-component>
				<div class="ms-auto d-flex align-items-center" id="navbar-actions-content">
				</div>
			</nav>
		`;
    this.renderNavbarActions();
  }

  renderNavbarActions() {
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';  // Temporary solution
    const navbarActions = this.querySelector('#navbar-actions-content');
    navbarActions.innerHTML = '';

    if (isLoggedIn) {
      const friendsButton = document.createElement('friends-button');
      const chatButton = document.createElement('chat-button');
      const notificationsButton = document.createElement('notifications-button');

      navbarActions.appendChild(friendsButton);
      navbarActions.appendChild(chatButton);
      navbarActions.appendChild(notificationsButton);
    }

    const dropdownMenu = document.createElement('dropdown-menu');
    navbarActions.appendChild(dropdownMenu);
  }
}

customElements.define('navbar-component', Navbar);
