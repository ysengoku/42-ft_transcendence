/**
 * @module UserSearch
 * @description
 * This module provides a user search component that allows users to search for other users.
 * It handles user input, fetches user data from the API, and displays the results in a dropdown.
 */

import { apiRequest, API_ENDPOINTS } from '@api';

/**
 * @class UserSearch
 * @extends HTMLElement
 */
export class UserSearch extends HTMLElement {
  #state = {
    searchQuery: '',
    userList: [],
    totalUsersCount: 0,
    currentListLength: 0,
    timeout: null,
    isLoading: false,
  };

  constructor() {
    super();

    this.clearUserList = this.clearUserList.bind(this);
    this.handleInput = this.handleInput.bind(this);
    this.handleDropdownHidden = this.handleDropdownHidden.bind(this);
    this.showMoreUsers = this.showMoreUsers.bind(this);
    this.preventReloadBySubmit = this.preventReloadBySubmit.bind(this);
  }

  /**
   * @description
   * Lifecycle method called when the element is added to the DOM.
   * It renders the component.
   * * @returns {void}
   */
  connectedCallback() {
    this.render();
  }

  /**
   * @description
   * Lifecycle method called when the element is removed from the DOM.
   * It cleans up event listeners to prevent memory leaks.
   * @returns {void}
   */
  disconnectedCallback() {
    this.button?.removeEventListener('hidden.bs.dropdown', this.handleDropdownHidden);
    this.form?.removeEventListener('click', this.clearUserList);
    this.form?.removeEventListener('submit', this.preventReloadBySubmit);
    this.input?.removeEventListener('click', this.clearUserList);
    this.input?.removeEventListener('input', this.handleInput);
    this.dropdown?.removeEventListener('scrollend', this.showMoreUsers);
    this.dropdownMobile?.removeEventListener('scrollend', this.showMoreUsers);
  }

  /* ------------------------------------------------------------------------ */
  /*     Render                                                               */
  /* ------------------------------------------------------------------------ */

  /**
   * @description
   * Renders the user search component.
   * It sets the inner HTML of the component and event listeners.
   * @returns {void}
   */
  render() {
    this.innerHTML = this.template();

    this.listContainer = this.querySelector('#navbar-user-list');
    this.button = document.getElementById('navbar-user-search');
    this.dropdown = document.getElementById('user-search-dropdown');
    this.form = this.querySelector('form');

    this.button?.addEventListener('hidden.bs.dropdown', this.handleDropdownHidden);
    this.dropdown?.addEventListener('scrollend', this.showMoreUsers);

    this.form
      ? (this.form.addEventListener('click', this.clearUserList),
        this.form.addEventListener('submit', this.preventReloadBySubmit),
        (this.input = this.form.querySelector('input')))
      : devErrorLog('User search form not found');
    this.input
      ? (this.input.addEventListener('click', this.clearUserList),
        this.input.addEventListener('input', this.handleInput))
      : devErrorLog('User search input not found');

    this.buttonMobile = document.getElementById('dropdown-item-user-search');
    this.dropdownMobile = document.getElementById('dropdown-user-search');
    this.buttonMobile?.addEventListener('hidden.bs.dropdown', this.handleDropdownHidden);
    this.dropdownMobile?.addEventListener('scrollend', this.showMoreUsers);
  }

  /**
   * @description
   * Renders the user list based on the current state.
   * It checks if there are users to display and appends them to the list container.
   * If no users are found, it displays a message indicating that no users were found.
   * @returns {void}
   */
  renderUserList() {
    if (this.#state.userList.length === 0) {
      this.renderNoUserFound();
      return;
    }
    for (let i = this.#state.currentListLength; i < this.#state.userList.length; i++) {
      const listItem = document.createElement('user-list-item');
      listItem.data = this.#state.userList[i];
      if (i === 0) {
        const firstItem = listItem.querySelector('.list-group-item');
        firstItem.classList.add('border-top-0');
      }
      this.listContainer.appendChild(listItem);
      this.#state.currentListLength++;
    }
  }

  /**
   * @description
   * Renders a message indicating that no users were found.
   */
  renderNoUserFound() {
    const noUser = document.createElement('li');
    noUser.innerHTML = this.noUserTemplate();
    this.listContainer.appendChild(noUser);
  }

  /* ------------------------------------------------------------------------ */
  /*     Event handling                                                       */
  /* ------------------------------------------------------------------------ */
  
  /**
   * @description
   * Clears the user list when the input is empty or the form is clicked.
   * @param {Event} event
   * @return {void}
   * @listens click
   */
  clearUserList(event) {
    event?.stopPropagation();
    if (this.input.value === '') {
      this.#state.userList = [];
      this.totalUserCount = 0;
      this.#state.currentListLength = 0;
      this.listContainer.innerHTML = '';
    }
  }

  /**
   * @description
   * Handles the input event on the search input field.
   * It debounces the input to prevent excessive API calls.
   * If the input value changes, it fetches the user data based on the search query.
   * If the input value is empty, it clears the user list.
   * @param {Event} event - Input event object
   * @returns {Promise<void>}
   * @listens input
   */
  async handleInput(event) {
    event.stopPropagation();
    event.preventDefault();

    clearTimeout(this.#state.timeout);
    this.#state.timeout = setTimeout(async () => {
      this.#state.userList = [];
      this.#state.totalUsersCount = 0;
      this.#state.currentListLength = 0;
      this.listContainer.innerHTML = '';
      if (this.#state.searchQuery !== this.input.value && event.target.value !== '') {
        this.#state.searchQuery = event.target.value;
        await this.searchUser();
      } else {
        this.#state.searchQuery = '';
      }
    }, 500);
  }

  /**
   * @description
   * Handles the dropdown hidden event.
   * It resets the search query, user list, and total user count.
   * It also clears the input field and the list container.
   * @returns {void}
   * @listens hidden.bs.dropdown
   */
  handleDropdownHidden() {
    this.#state.searchQuery = '';
    this.#state.userList = [];
    this.totalUserCount = 0;
    this.listContainer.innerHTML = '';
    this.input.value = '';
  }

  /**
   * @description
   * Handles the scroll event on the user search dropdown.
   * It checks if the user has scrolled to the bottom of the dropdown and loads more users if available.
   * It prevents loading more users if the total user count has been reached or if the component is already loading users.
   * @param {Event} event - Scroll event object
   * @returns {Promise<void>}
   * @listens scrollend
   */
  async showMoreUsers(event) {
    const { scrollTop, scrollHeight, clientHeight } = event.target;
    const threshold = 5;
    if (
      Math.ceil(scrollTop + clientHeight) < scrollHeight - threshold ||
      this.#state.totalUsersCount === this.#state.currentListLength ||
      this.#state.isLoading
    ) {
      return;
    }
    this.#state.isLoading = true;
    await this.searchUser();
    this.#state.isLoading = false;
  }

  /**
   * @description
   * Searches for users based on the current search query.
   * It makes an API request to fetch users matching the search query.
   * If the request is successful, it updates the user list and renders the user list.
   * If the request fails, it displays a message indicating that the user search is temporarily unavailable.
   * @returns {Promise<void>}
   */
  async searchUser() {
    const response = await apiRequest(
      'GET',
      /* eslint-disable-next-line new-cap */
      API_ENDPOINTS.USER_SEARCH(this.#state.searchQuery, 10, this.#state.currentListLength),
      null,
      false,
      true,
    );
    if (!response.success) {
      const noUser = document.createElement('li');
      noUser.innerHTML = this.noUserTemplate();
      const message = noUser.querySelector('p');
      if (message) {
        message.textContent = 'Tempoeary unavailable';
      }
      this.listContainer.appendChild(noUser);
      return;
    }
    if (response.data) {
      this.#state.totalUsersCount = response.data.count;
      this.#state.userList.push(...response.data.items);
    }
    this.renderUserList();
  }

  /**
   * @description
   * Prevents the form from reloading the page when submitted.
   * This is necessary to allow the user search to function without a page reload.
   * @param {Event} event - The submit event object.
   * @return {void}
   * @listens submit
   */
  preventReloadBySubmit(event) {
    event.preventDefault();
  }

  /* ------------------------------------------------------------------------ */
  /*     Template & style                                                     */
  /* ------------------------------------------------------------------------ */
  template() {
    return `
    <form class="d-flex mx-3 mt-3 mb-2" role="search" id="user-search-form">
      <div class="input-group mt-2">
        <span class="input-group-text" id="basic-addon1"><i class="bi bi-search"></i></span>
        <input class="form-control" type="search" placeholder="Find user(s)" aria-label="Search" autocomplete="off" id="user-search-form-input">
      </div>
    </form>
    <div class="ps-3 pe-4">
        <ul class="list-group mb-2" id="navbar-user-list"></ul>
    </div>
    `;
  }

  noUserTemplate() {
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
      <p class="text-center m-0">No user found</p>
    </div>
    `;
  }
}

customElements.define('user-search', UserSearch);
