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
        navbarActions.appendChild(searchUserButtotn);
        navbarActions.appendChild(friendsButton);
      }
      const chatButton = document.createElement('chat-button');
      const notificationsButton = document.createElement('notifications-button');
      navbarActions.appendChild(chatButton);
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
      background-color: rgba(var(--pm-primary-600-rgb), 0.7);
    }
    .navbar-button i {
      font-size: 1.5rem;
      color: var(--pm-primary-100);
    }
    .dropdown-menu {
      max-height: 75vh;
      min-width: 360px;
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
    .notification-badge {
      display: block;
      position: absolute;
      width: 12px;
      height: 12px;
      background-color: var(--pm-red-400);
      border-radius: 50%;
      top: 8px;
      right: 8px;
    }
    </style>
    `;
  }
}

customElements.define('navbar-component', Navbar);
