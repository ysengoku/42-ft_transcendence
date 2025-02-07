import { auth } from '@auth/authManager.js';

export class Navbar extends HTMLElement {
  constructor() {
    super();
    this.isLoggedIn = false;
    this.loginStatusHandler = this.updateNavbar.bind(this);
  }

  async connectedCallback() {
    document.addEventListener('loginStatusChange', this.loginStatusHandler);
    this.isLoggedIn = await auth.fetchAuthStatus();
    this.render();
  }

  disconnectedCallback() {
    document.removeEventListener('loginStatusChange', this.loginStatusHandler);
  }

  updateNavbar(event) {
    this.isLoggedIn = event.detail.user !== null;
    this.render();
  }

  render() {
    this.innerHTML = `
      <style>
        .navbar {
          background-color: #3b3b3b;
        }
      </style>
			<nav class="navbar navbar-expand navbar-dark px-3">
				<navbar-brand-component></navbar-brand-component>
				<div class="ms-auto d-flex align-items-center" id="navbar-actions-content">
				</div>
			</nav>
		`;

    const navbarBrand = this.querySelector('navbar-brand-component');
    navbarBrand.setLoginStatus(this.isLoggedIn);
    this.renderNavbarActions();
  }

  renderNavbarActions() {
    const navbarActions = this.querySelector('#navbar-actions-content');
    navbarActions.innerHTML = '';
    if (this.isLoggedIn) {
      const friendsButton = document.createElement('friends-button');
      const chatButton = document.createElement('chat-button');
      const notificationsButton = document.createElement('notifications-button');

      navbarActions.appendChild(friendsButton);
      navbarActions.appendChild(chatButton);
      navbarActions.appendChild(notificationsButton);
    }

    const dropdownMenu = document.createElement('navbar-dropdown-menu');
    dropdownMenu.setLoginStatus(this.isLoggedIn);
    navbarActions.appendChild(dropdownMenu);
  }
}

customElements.define('navbar-component', Navbar);
