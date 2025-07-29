/**
 * @module UserActionsMenu
 * @description Dropdown menu for user actions on media screens narrower than the MD breakpoint.
 * Includes user search and friend list
 */

import { router } from '@router';
import { isMobile } from '@utils';

export class UserActionsMenu extends HTMLElement {
  /**
   * Private state of the NotificationsListItem component.
   * @property {boolean} isLoggedin - Indicates if the user is logged in.
   */
  #state = {
    isLoggedin: false,
  };

  constructor() {
    super();

    this.dropdownUserActions = null;
    this.dropdownUserSearch = null;
    this.dropdownFriendsList = null;
    this.dropdownusersearchList = null;
    this.userActionsButton = null;
    this.userSearchButton = null;
    this.friendsListButton = null;

    this.showUserActionsDropdown = this.showUserActionsDropdown.bind(this);
    this.hideUserActionsDropdown = this.hideUserActionsDropdown.bind(this);
    this.handleClickUserSearch = this.handleClickUserSearch.bind(this);
    this.handleClickFriendsList = this.handleClickFriendsList.bind(this);
  }

  /**
   * @description
   * Lifecycle method called when the element is removed from the DOM.
   * It cleans up event listeners to prevent memory leaks.
   */
  disconnectedCallback() {
    this.userActionsButton?.removeEventListener('shown.bs.dropdown', this.showUserActionsDropdown);
    this.userActionsButton?.removeEventListener('hidden.bs.dropdown', this.hideUserActionsDropdown);
    this.userSearchButton?.removeEventListener('click', this.handleClickUserSearch);
    this.friendsListButton?.removeEventListener('click', this.handleClickFriendsList);
  }

  /**
   * @description
   * Updates the login status of the user.
   * If the status has not changed, it does nothing.
   * If the user is logged in, it renders the component.
   * @param {boolean} isLoggedin 
   * @returns {void}
   */
  updateLoginStatus(isLoggedin) {
    if (this.#state.isLoggedin === isLoggedin) {
      return;
    }
    this.#state.isLoggedin = isLoggedin;
    this.render();
  }

  /**
   * @description
   * Renders the user actions menu component.
   * It updates the inner HTML of the component based on the login status and screen size.
   * @returns {void}
   */
  render() {
    if (!this.#state.isLoggedin || !isMobile()) {
      this.innerHTML = '';
      return;
    }
    this.innerHTML = this.style() + this.template();

    this.dropdownUserActions = document.getElementById('dropdown-user-actions');
    this.dropdownUserSearch = document.getElementById('dropdown-user-search');
    this.dropdownFriendsList = document.getElementById('dropdown-friends-list');
    this.dropdownusersearchList = document.querySelector('user-search');

    this.userActionsButton = document.getElementById('navbar-user-actions');
    this.userSearchButton = document.getElementById('dropdown-item-user-search');
    this.friendsListButton = document.getElementById('dropdown-item-friends-list');

    this.userActionsButton.addEventListener('shown.bs.dropdown', this.showUserActionsDropdown);
    this.userActionsButton.addEventListener('hidden.bs.dropdown', this.hideUserActionsDropdown);

    this.userSearchButton.addEventListener('click', this.handleClickUserSearch);
    this.friendsListButton.addEventListener('click', this.handleClickFriendsList);
  }

  /**
   * @description
   * Shows the user actions dropdown and hides other dropdowns.
   * This method is called when the user clicks on the user actions button.
   * It ensures that only one dropdown is visible at a time.
   * @returns {void}
   * @listens shown.bs.dropdown
   */
  showUserActionsDropdown() {
    this.dropdownUserActions.classList.add('show');
    this.dropdownUserSearch.classList.remove('show');
    this.dropdownFriendsList.classList.remove('show');
  }

  /**
   * @description
   * Hides the user actions dropdown and clears the user search list.
   * This method is called when the user clicks outside the dropdown or closes it.
   * It ensures that the dropdown is hidden and the user search list is cleared.
   * @returns {void}
   * @listens hidden.bs.dropdown
   */
  hideUserActionsDropdown() {
    this.dropdownUserActions.classList.remove('show');
    this.dropdownUserSearch.classList.remove('show');
    this.dropdownFriendsList.classList.remove('show');
    this.dropdownusersearchList.clearUserList();
  }

  /**
   * @description
   * Handles the click event on the user search button.
   * It shows the user search dropdown and hides other dropdowns.
   * @param {Event} event - Click event object
   * @returns {void}
   * @listens click
   */
  handleClickUserSearch(event) {
    event.stopPropagation();
    this.dropdownUserActions.classList.remove('show');
    this.dropdownUserSearch.classList.add('show');
    this.dropdownFriendsList.classList.remove('show');
  }

  /**
   * @description
   * Handles the click event on the friends list button.
   * It shows the friends list dropdown and hides other dropdowns.
   * It also fetches the friends data to ensure the list is up-to-date.
   * @param {Event} event - Click event object
   * @returns {Promise<void>}
   * @listens click
   */
  async handleClickFriendsList(event) {
    event.stopPropagation();
    this.dropdownUserActions.classList.remove('show');
    this.dropdownUserSearch.classList.remove('show');
    this.dropdownFriendsList.classList.add('show');

    const friendList = document.querySelector('friends-list');
    await friendList.fetchFriendsData();
  }

  template() {
    return `
    <div class="nav-link me-2" id="navbar-user-actions" role="button" data-bs-toggle="dropdown" aria-expanded="false">
      <div class="navbar-icon d-inline-block">
        <i class="bi bi-list"></i>
      </div>
    </div>

    <!-- User actions -->
    <div class="dropdown-menu p-3" aria-labelledby="navbar-user-actions" data-bs-auto-close="outside" id="dropdown-user-actions">
      <div class="dropdown-item mb-2" id="dropdown-item-user-search">Find user</div>
      <div class="dropdown-item mb-2" id="dropdown-item-friends-list">Friends list</div>
    </div>

    <!-- User search -->
    <div class="dropdown-menu p-3" id="dropdown-user-search">
      <user-search></user-search>
    </div>

    <!-- Friends list -->
    <div class="dropdown-menu p-3" id="dropdown-friends-list">
      <friends-list></friends-list>
    </div>
    `;
  }

  style() {
    return `
    <style>
      #navbar-user-actions i {
        font-size: 40px;
        color: var(--pm-primary-100);
      }
      .dropdown-menu {
        position: absolute;
        top: 100%;
        left: 0;
        max-height: 75vh;
        overflow: auto;
      }
    </style>  
    `;
  }
}

customElements.define('user-actions-menu', UserActionsMenu);
