/**
 * @module DropdownMenu
 * @description
 * This module defines a custom dropdown menu component for the navbar.
 * It handles user login status, theme toggling.
 * Provides links to user profile and settings, logout button for logged-in user.
 * If the user is not logged-in, it provides links to login and registration pages.
 * It also includes a credits accordion for displaying credits information.
 */

import { auth, handleLogout } from '@auth';
import { ThemeController } from '@utils';
import anonymousavatar from '/img/anonymous-avatar.png?url';

/**
 * @class DropdownMenu
 * @extends HTMLElement
 */
export class DropdownMenu extends HTMLElement {
  /**
   * Private state of the DropdownMenu component.
   * @property {Object} - Contains user data and login status.
   * @property {boolean} isLoggedIn - Indicates if the user is logged in.
   * @property {Object} user - The user data.
   */
  #state = {
    isLoggedIn: false,
    user: null,
  };

  constructor() {
    super();
    this.handleLogoutClick = this.handleLogoutClick.bind(this);
    this.handleThemeChange = this.handleThemeChange.bind(this);
  }

  /**
   * @description
   * Sets the user state and updates the login status.
   * @param {boolean} isLoggedIn
   * @param {Object} user - The user data to set.
   * @returns {void}
   */
  async setLoginStatus(isLoggedIn, user = null) {
    this.#state.isLoggedIn = isLoggedIn;
    if (this.#state.isLoggedIn) {
      if (user) {
        this.#state.user = user;
      } else {
        this.#state.user = await auth.getUser();
        if (!this.#state.user) {
          this.#state.isLoggedIn = false;
        }
      }
    }
    this.render();
  }

  disconnectedCallback() {
    this.logoutButton?.removeEventListener('click', this.handleLogoutClick);
    this.themeToggleButton?.removeEventListener('click', this.handleThemeChange);
  }

  /**
   * @description
   * Renders the dropdown menu component by setting its inner HTML.
   * It initializes the avatar image, menu list according to the user's login status,
   * and sets up event listeners for theme toggle and logout button if the user is logged-in.
   * @returns {void}
   */
  render() {
    this.innerHTML = this.template();

    this.avatarImg = this.querySelector('#avatar-img');
    this.avatarImg.src = this.#state.user ? this.#state.user.avatar : `${anonymousavatar}`;

    if (this.#state.isLoggedIn) {
      this.linkToProfile = this.querySelector('#dropdown-item-profile');
      this.linkToProfile.href = `/profile/${this.#state.user.username}`;
    }

    requestAnimationFrame(() => {
      this.themeToggleButton = document.getElementById('theme-toggle');
      this.themeToggleButton.addEventListener('click', this.handleThemeChange);

      if (this.#state.isLoggedIn) {
        this.logoutButton = document.getElementById('dropdown-item-logout');
        this.logoutButton.addEventListener('click', this.handleLogoutClick);
      }
    });
  }

  /**
   * @description
   * Handles the logout button click event.
   * It calls the `handleLogout` function to log the user out.
   * @returns {void}
   */
  handleLogoutClick() {
    handleLogout();
  }

  /**
   * @description
   * Handles the theme toggle button click event.
   * It toggles the theme using the `ThemeController` and updates the theme label accordingly to reflect the current theme state.
   * @returns {void}
   */
  handleThemeChange() {
    const newTheme = ThemeController.toggleTheme();
    const themeLabel = document.getElementById('theme-label');
    if (themeLabel) {
      const icon = themeLabel.querySelector('i');
      if (icon) {
        icon.className = newTheme === 'dark' ? 'bi bi-sun mt-1' : 'bi bi-moon-stars mt-1';
      }
      const themeText = themeLabel.querySelector('span');
      if (themeText) {
        themeText.textContent = newTheme === 'dark' ? 'Day Mode' : 'Night Mode';
      }
    }
  }

  template() {
    const isDarkMode = ThemeController.getTheme() === 'dark';

    return `
    <div class="nav-link dropdown-toggle" id="navbarDropdown" role="button" data-bs-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
      <img id="avatar-img" alt="user" class="d-inline-block align-top avatar-s rounded-circle">
    </div>
    <div class="dropdown-menu dropdown-menu-end pt-2" aria-labelledby="navbarDropdown">
      ${
        this.#state.isLoggedIn
          ? `
        <a href="/home" class="dropdown-item">Saloon</a>
        <a class="dropdown-item" id="dropdown-item-profile">My profile</a>
        <a href="/settings" class="dropdown-item">Settings</a>
      `
          : `
        <a href="/login" class="dropdown-item">Login</a>
        <a href="/register" class="dropdown-item">Sign up</a>
      `
      }
      <div class="dropdown-divider"></div>
      <button class="dropdown-item" id="theme-toggle">
        <div id="theme-label" class="d-flex align-items-center gap-2">
          <span class="m-0">${isDarkMode ? 'Day Mode' : 'Night Mode'}</span>
          <i class="mt-1 bi ${isDarkMode ? 'bi-sun' : 'bi-moon-stars'}"></i>
        </div>
      </button>
      ${
        this.#state.isLoggedIn
          ? `
        <div class="dropdown-divider"></div>
        <div class="dropdown-item" id="dropdown-item-logout">Logout</div>
        `
          : ''
      }

      <div class="dropdown-divider"></div>
      <credits-accordion></credits-accordion>
    </div>
    `;
  }
}

customElements.define('navbar-dropdown-menu', DropdownMenu);
