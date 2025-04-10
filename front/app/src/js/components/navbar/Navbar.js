import { auth } from '@auth';
import { isMobile } from '@utils';

export class Navbar extends HTMLElement {
  #state = {
    user: '',
    isLoggedin: false,
  };

  constructor() {
    super();
    this.updateNavbar = this.updateNavbar.bind(this);
  }

  connectedCallback() {
    document.addEventListener('userStatusChange', this.updateNavbar);
    this.#state.user = auth.getStoredUser();
    this.#state.isLoggedin = this.#state.user ? true : false;
    this.render();
    window.addEventListener('resize', () => {
      this.render();
    });
  }

  disconnectedCallback() {
    document.removeEventListener('userStatusChange', this.updateNavbar);
  }

  render() {
    this.innerHTML = this.template() + this.style();

    this.navbarBrand = this.querySelector('navbar-brand-component');
    this.navbarBrand.setLoginStatus(this.#state.isLoggedin);
    this.renderNavbarActions();
  }

  renderNavbarActions() {
    const navbarActions = this.querySelector('#navbar-actions-content');
    navbarActions.innerHTML = '';
    if (this.#state.isLoggedin) {
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
      if (this.#state.user.unread_messages_count > 0 && window.location.pathname !== '/chat') {
        chatButton.querySelector('.notification-badge').classList.remove('d-none');
      }
      if (this.#state.user.unread_notifications_count > 0) {
        notificationsButton.querySelector('.notification-badge').classList.remove('d-none');
      }
    }
    const dropdownMenu = document.createElement('navbar-dropdown-menu');
    dropdownMenu.setLoginStatus(this.#state.isLoggedin);
    navbarActions.appendChild(dropdownMenu);
  }

  updateNavbar(event) {
    this.#state.isLoggedin = event.detail.user !== null;
    if (this.#state.isLoggedin) {
      this.#state.user =auth.getStoredUser();
    }
    this.navbarBrand.setLoginStatus(this.#state.isLoggedin);
    this.renderNavbarActions();
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
    .navbar-button {
      padding: 0.5rem;
      i {
        font-size: 1.5rem;
        color: var(--pm-primary-100);
      }
    }
    .dropdown-menu-end {
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
      width: 14px;
      height: 14px;
      background-color: var(--pm-red-400);
      border-radius: 50%;
      top: 8px;
      right: 4px;
    }
    </style>
    `;
  }
}

customElements.define('navbar-component', Navbar);
