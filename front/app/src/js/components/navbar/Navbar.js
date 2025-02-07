import { auth } from '@auth/authManager.js';

export class Navbar extends HTMLElement {
  constructor() {
    super();
    this.isLoggedIn = false;
  }

  connectedCallback() {
    this.render();
  }

  render() {
    this.isLoggedIn = auth.isLoggedIn();
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
