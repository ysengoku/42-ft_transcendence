import { auth } from '@auth';
import { isMobile } from '@utils';

export class Navbar extends HTMLElement {
  constructor() {
    super();
    this.isLoggedin = false;
    this.loginStatusHandler = this.updateNavbar.bind(this);
  }

  async connectedCallback() {
    document.addEventListener('userStatusChange', this.loginStatusHandler);
    this.isLoggedin = auth.getStoredUser() ? true : false;
    this.render();
    window.addEventListener('resize', () => {
      this.render();
    });
  }

  disconnectedCallback() {
    document.removeEventListener('userStatusChange', this.loginStatusHandler);
  }

  render() {
    this.innerHTML = this.template() + this.style();

    const navbarBrand = this.querySelector('navbar-brand-component');
    navbarBrand.setLoginStatus(this.isLoggedin);
    this.renderNavbarActions();
  }

  renderNavbarActions() {
    const navbarActions = this.querySelector('#navbar-actions-content');
    navbarActions.innerHTML = '';
    if (this.isLoggedin) {
      if (!isMobile()) {
        const searchUserButtotn = document.createElement('user-search-button');
        const friendsButton = document.createElement('friends-button');
        const chatButton = document.createElement('chat-button');
        navbarActions.appendChild(searchUserButtotn);
        navbarActions.appendChild(friendsButton);
        navbarActions.appendChild(chatButton);
      }
      const notificationsButton = document.createElement('notifications-button');
      navbarActions.appendChild(notificationsButton);
    }
    const dropdownMenu = document.createElement('navbar-dropdown-menu');
    dropdownMenu.setLoginStatus(this.isLoggedin);
    navbarActions.appendChild(dropdownMenu);
  }

  updateNavbar(event) {
    this.isLoggedin = event.detail.user !== null;
    this.render();
  }

  template() {
    return `
		<nav class="navbar navbar-expand navbar-dark px-3">
      <user-actions-menu></user-actions-menu>
			<navbar-brand-component></navbar-brand-component>
			<div class="ms-auto d-flex align-items-center" id="navbar-actions-content">
			</div>
		</nav>
		`;
  }

  style() {
    return `
    <style>
    .navbar {
      background-color: rgba(59, 59, 59, 0.6);
    }
    .navbar-button i {
      font-size: 1.5rem;  
    }
    .dropdown-menu {
      max-height: 75vh;
      padding-top: 0;
    }
    .dropdown-list-header {
      border-bottom: 1px solid var(--bs-border-color);
      position: sticky;
      top: 0;
      background-color: var(--bs-body-bg);
      z-index: 1;
    }
	  .dropdown-list-item {
	    border: none;
      border-top: 1px solid var(--bs-border-color);
	    padding: 16px 8px;
	    position: relative;
    }
    .dropdown-list-avatar-container {
	    position: relative;
	    display: inline-block;
	    margin-right: 10px;
    }
    .dropdown-list-avatar {
      width: 56px;
      height: 56px;
      object-fit: cover;
    }
    /*
    .badge {
      position: absolute;
      top: 0;
      right: 0;
      width: 10px;
      height: 10px;
      background-color: red;
      border-radius: 50%;
      display: block;
    }
    */
    </style>
    `;
  }
}

customElements.define('navbar-component', Navbar);
