/**
 * @module FriendsList
 * @description
 * This module defines a custom friends list component for the navbar.
 * It fetches and displays the user's friends list, handles pagination,
 * and provides a template for rendering the friends list.
 * It also handles the dropdown visibility and scroll events for loading more friends.
 */

import { auth } from '@auth';
import { apiRequest, API_ENDPOINTS } from '@api';

/**
 * @class FriendsList
 * @extends HTMLElement
 */
export class FriendsList extends HTMLElement {
  /**
   * Private state of the FriendsList component.
   * @property {string} username - The username of the logged-in user.
   * @property {Array} friendsList - The list of friends fetched from the API.
   * @property {number} totalFriendsCount - The total number of friends.
   * @property {number} listLength - The current length of the friends list displayed.
   */
  #state = {
    username: '',
    friendsList: [],
    totalFriendsCount: 0,
    listLength: 0,
  };

  constructor() {
    super();
    this.fetchFriendsData = this.fetchFriendsData.bind(this);
    this.handleDropdownClose = this.handleDropdownClose.bind(this);
    this.showMoreFriends = this.showMoreFriends.bind(this);
  }

  /**
   * @description
   * Lifecycle method called when the element is added to the DOM.
   * It renders the friends list.
   */
  connectedCallback() {
    this.render();
  }

  /**
   * @description
   * Lifecycle method called when the element is removed from the DOM.
   * It removes event listeners to prevent memory leaks.
   */
  disconnectedCallback() {
    this.button?.removeEventListener('shown.bs.dropdown', this.fetchFriendsData);
    this.button?.removeEventListener('hidden.bs.dropdown', this.handleDropdownClose);
    this.dropdown?.removeEventListener('scrollend', this.showMoreFriends);
  }

  /**
   * @description
   * Renders the friends list component by setting its inner HTML.
   * It initializes the button and dropdown elements, sets up event listeners for fetching friends data,
   * and handles the dropdown close event.
   * @returns {void}
   */
  render() {
    this.innerHTML = this.template();

    this.button = document.getElementById('navbar-friends-button');
    this.dropdown = document.getElementById('friends-list-dropdown');
    this.listContainer = this.querySelector('#friends-list');

    this.button?.addEventListener('shown.bs.dropdown', this.fetchFriendsData);
    this.button?.addEventListener('hidden.bs.dropdown', this.handleDropdownClose);
    this.dropdown?.addEventListener('scrollend', this.showMoreFriends);

    this.dropdownMobile = document.getElementById('dropdown-friends-list');
    this.dropdownMobile?.addEventListener('scrollend', this.showMoreFriends);
  }

  /**
   * @description
   * Fetches the friends data from the API and updates the state.
   * It handles the case when the user is not logged in or when the friends list is empty.
   * If the API request fails, it displays a message indicating that the friends list is temporarily unavailable.
   * @returns {Promise<void>}
   */
  async fetchFriendsData() {
    const userData = await auth.getUser();
    if (!userData) {
      return;
    }
    this.#state.username = userData.username;
    this.#state.listLength = this.#state.friendsList.length;
    const response = await apiRequest(
      'GET',
      /* eslint-disable-next-line new-cap */
      API_ENDPOINTS.USER_FRIENDS_LIST(this.#state.username, 10, this.#state.listLength),
      null,
      false,
      true,
    );
    if (!response.success) {
      devErrorLog('Failed to fetch friends list:', response);
      const unavailable = document.createElement('li');
      unavailable.innerHTML = this.unavailableTemplate();
      const message = unavailable.querySelector('p');
      if (message) {
        message.innerText = 'Temporary unavailable';
      }
      this.listContainer.appendChild(unavailable);
    }
    if (response.data) {
      this.#state.totalFriendsCount = response.data.count;
      this.#state.friendsList.push(...response.data.items);
    }
    this.renderFriendsList();
  }

  /**
   * @description
   * Renders the friends list by creating user list items for each friend in the state.
   * It handles the case when there are no friends found by rendering a message indicating that.
   * It also updates the list length in the state.
   * @returns {void}
   */
  renderFriendsList() {
    if (this.#state.friendsList.length === 0) {
      this.renderNoFriendsFound();
      return;
    }
    for (let i = this.#state.listLength; i < this.#state.friendsList.length; i++) {
      const listItem = document.createElement('user-list-item');
      listItem.data = this.#state.friendsList[i];
      if (i === 0) {
        const firstItem = listItem.querySelector('.list-group-item');
        firstItem.classList.add('border-top-0');
      }
      this.listContainer.appendChild(listItem);
      this.#state.listLength++;
    }
  }

  /**
   * @description
   * Renders a message indicating that no friends were found.
   */
  renderNoFriendsFound() {
    const noFriends = document.createElement('li');
    noFriends.innerHTML = this.unavailableTemplate();
    this.listContainer.appendChild(noFriends);
  }

  /**
   * @description
   * Handles the dropdown close event by resetting the friends list state and clearing the list container.
   * It is called when the dropdown is closed to ensure that the friends list is cleared.
   * @returns {void}
   */
  handleDropdownClose() {
    this.#state.friendsList = [];
    this.#state.totalFriendsCount = 0;
    this.listContainer.innerHTML = '';
  }

  /**
   * @description
   * Handles the scroll event in the dropdown to load more friends when the user scrolls to the bottom.
   * It checks if the user has scrolled to the bottom and if there are more friends to load.
   * If so, it fetches more friends data and updates the list.
   * If the total friends count is reached, it does not fetch more data.
   * @param {Event} event - The scroll event triggered by the dropdown.
   * @returns {Promise<void>}
   * @listens scrollend
   */
  async showMoreFriends(event) {
    const { scrollTop, scrollHeight, clientHeight } = event.target;
    const threshold = 5;
    if (
      Math.ceil(scrollTop + clientHeight) < scrollHeight - threshold ||
      this.#state.totalFriendsCount === this.#state.listLength
    ) {
      return;
    }
    await this.fetchFriendsData();
  }

  template() {
    return `
    <div class="ps-3 pe-4">
      <h6 class="py-4 dropdown-list-header" sticky>Friends</h6>
      <ul class="dropdown-list list-group mb-2" id="friends-list"></ul>
    </div>
    `;
  }

  unavailableTemplate() {
    return `
    <style>
    .list-group-item {
      border: none;
      position: relative;
    }
    li {
        list-style-type: none;
    }
    </style>
    <div class="list-group-item p-3">
      <p class="text-center m-0">No friends found</p>
    </div>
    `;
  }
}

customElements.define('friends-list', FriendsList);
