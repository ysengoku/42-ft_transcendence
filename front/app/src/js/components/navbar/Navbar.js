/**
 * @module Navbar
 * @description
 * It handles user login status, responsive design for mobile and desktop,
 * and dynamically updates the navbar actions based on user state.
 */

import { isMobile } from '@utils';

/**
 * @class Navbar
 * @extends HTMLElement
 * @description
 * This class renders the navbar brand and actions and handles responsive design for mobile and desktop views.
 * It listens for user status changes and updates the navbar accordingly.
 * It also handles the rendering of user actions buttons based on the login status.
 */
export class Navbar extends HTMLElement {
  /**
   * Private state of the DuelMenu component.
   * @property {Object} - Contains user data and login status.
   * @property {Object} user - The user data.
   * @property {boolean} isLoggedin - Indicates if the user is logged in.
   * @property {boolean} isMobile - Indicates if the view is on a mobile device
   */
  #state = {
    user: null,
    isLoggedin: false,
    isMobile: false,
  };

  constructor() {
    super();
    this.render = this.render.bind(this);
    this.updateNavbar = this.updateNavbar.bind(this);
    this.handleResize = this.handleResize.bind(this);
  }

  /**
   * @description Sets the user state and updates the login status.
   * @param {Object} data - The user data to set.
   * @returns {void}
   */
  set state(data) {
    this.#state.user = data;
    this.#state.isLoggedin = this.#state.user ? true : false;
  }

  /**
   * @description
   * Lifecycle method called when the element is added to the DOM.
   * It initializes the state, sets up event listeners, and renders the navbar.
   * @returns {void}
   */
  connectedCallback() {
    this.#state.isMobile = isMobile();
    document.addEventListener('userStatusChange', this.updateNavbar);
    window.addEventListener('resize', this.handleResize);
    this.render();
  }

  /**
   * @description
   * Lifecycle method called when the element is removed from the DOM.
   * It removes the event listeners to prevent memory leaks.
   * @returns {void}
   */
  disconnectedCallback() {
    document.removeEventListener('userStatusChange', this.updateNavbar);
    window.removeEventListener('resize', this.handleResize);
  }

  /**
   * @description
   * Renders the navbar component by setting its inner HTML and initializing child components.
   * It also updates the login status and renders the navbar actions based on the current state.
   */
  render() {
    this.innerHTML = this.style() + this.template();

    this.navbarBrand = this.querySelector('navbar-brand-component');
    this.mobileUserActionsMenu = this.querySelector('user-actions-menu');

    this.navbarBrand.setLoginStatus(this.#state.isLoggedin);
    this.renderNavbarActions();
  }

  /**
   * @description
   * Renders the user actions buttons in the navbar based on the user's login status.
   * It creates and appends user search, friends, chat, notifications, and dropdown menu components.
   * If the user is logged in, it displays the appropriate buttons and updates their states.
   * If the user is not logged in, it only displays the dropdown menu.
   * @returns {void}
   */
  renderNavbarActions() {
    const navbarActions = this.querySelector('#navbar-actions-content');
    navbarActions.innerHTML = '';
    if (this.#state.isLoggedin) {
      if (!this.#state.isMobile) {
        const searchUserButtotn = document.createElement('user-search-button');
        const friendsButton = document.createElement('friends-button');
        navbarActions.appendChild(searchUserButtotn);
        navbarActions.appendChild(friendsButton);
      } else {
        this.mobileUserActionsMenu.updateLoginStatus(this.#state.isLoggedin);
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
    dropdownMenu.setLoginStatus(this.#state.isLoggedin, this.#state.user);
    navbarActions.appendChild(dropdownMenu);
  }

  /**
   * @description
   * Updates the navbar based on the user status change event.
   * It updates the login status and user data, re-renders the navbar actions,
   * and updates the mobile user actions menu if applicable.
   * @param {Event} event - The user status change event containing user data.
   * @return {void}
   * @listens userStatusChange
   */
  updateNavbar(event) {
    this.#state.isLoggedin = event.detail.user !== null;
    if (this.#state.isLoggedin) {
      this.#state.user = event.detail.user;
    }
    this.navbarBrand.setLoginStatus(this.#state.isLoggedin);
    this.renderNavbarActions();
    if (isMobile()) {
      this.mobileUserActionsMenu.updateLoginStatus(this.#state.isLoggedin);
    }
  }

  /**
   * @description
   * Handles the resize event to toggle the mobile user actions menu visibility
   * and updates the state based on the current media size.
   * If the media size has changed, it updates the `isMobile` state and toggles the visibility of the mobile user actions menu.
   * @listens resize
   * @returns {void}
   */
  handleResize() {
    const mediaSizeChanged = this.#state.isMobile !== isMobile();
    if (!this.#state.isLoggedin || !mediaSizeChanged) {
      return;
    }
    this.#state.isMobile = !this.#state.isMobile;
    if (this.#state.isMobile) {
      this.mobileUserActionsMenu.classList.remove('d-none');
      this.mobileUserActionsMenu.updateLoginStatus(this.#state.isLoggedin);
    } else {
      this.mobileUserActionsMenu.classList.add('d-none');
      this.mobileUserActionsMenu.updateLoginStatus(this.#state.isLoggedin);
    }
    this.renderNavbarActions();
  }

  template() {
    return `
    <nav class="navbar navbar-expand fixed-top px-3">
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
      background-color: rgba(var(--pm-primary-600-rgb), 1.0);
    }
    .navbar-button {
      padding: 0.5rem;
      i {
        font-size: 1.5rem;
        color: var(--pm-primary-100);
      }
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
