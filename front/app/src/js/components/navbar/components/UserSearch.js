/**
 * @module UserSearch
 * @description
 * This module provides a user search component that allows users to search for other users.
 * It handles user input, fetches user data from the API, and displays the results in a dropdown.
 */

import { apiRequest, API_ENDPOINTS } from '@api';
import { isMobile } from '@utils';

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
    isMobile: false,
  };

  /**
   * @property {IntersectionObserver} observer - The IntersectionObserver instance for lazy loading user list.
   * @property {HTMLElement} loadMoreAnchor - The anchor element for loading more users.
   */
  #observer = null;
  #loadMoreAnchor = null;

  constructor() {
    super();
    this.#state.isMobile = isMobile();

    this.clearUserList = this.clearUserList.bind(this);
    this.handleInput = this.handleInput.bind(this);
    this.handleDropdownHidden = this.handleDropdownHidden.bind(this);
    this.showMoreUsers = this.showMoreUsers.bind(this);
    this.preventReloadBySubmit = this.preventReloadBySubmit.bind(this);
    this.handleResize = this.handleResize.bind(this);
  }

  /**
   * @description
   * Lifecycle method called when the element is added to the DOM.
   * It renders the component.
   * * @returns {void}
   */
  connectedCallback() {
    this.render();
    window.addEventListener('resize', this.handleResize);
  }

  /**
   * @description
   * Lifecycle method called when the element is removed from the DOM.
   * It cleans up event listeners to prevent memory leaks.
   * @returns {void}
   */
  disconnectedCallback() {
    this.cleanObserver();
    this.button?.removeEventListener('hidden.bs.dropdown', this.handleDropdownHidden);
    this.form?.removeEventListener('click', this.clearUserList);
    this.form?.removeEventListener('submit', this.preventReloadBySubmit);
    this.input?.removeEventListener('click', this.clearUserList);
    this.input?.removeEventListener('input', this.handleInput);
    this.buttonMobile?.removeEventListener('hidden.bs.dropdown', this.handleDropdownHidden);
    window.removeEventListener('resize', this.handleResize);
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
    this.innerHTML = this.style() + this.template();

    this.listWrapper = this.querySelector('#navbar-user-list-wrapper');
    this.listContainer = this.querySelector('#navbar-user-list');
    this.button = document.getElementById('navbar-user-search');
    this.dropdown = document.getElementById('user-search-dropdown');
    this.form = this.querySelector('form');

    this.button?.addEventListener('hidden.bs.dropdown', this.handleDropdownHidden);

    this.form
      ? (this.form.addEventListener('click', this.clearUserList),
        this.form.addEventListener('submit', this.preventReloadBySubmit),
        (this.input = this.form.querySelector('input')))
      : log.error('User search form not found');
    this.input
      ? (this.input.addEventListener('click', this.clearUserList),
        this.input.addEventListener('input', this.handleInput))
      : log.error('User search input not found');

    this.buttonMobile = document.getElementById('dropdown-item-user-search');
    this.dropdownMobile = document.getElementById('dropdown-user-search');
    this.buttonMobile?.addEventListener('hidden.bs.dropdown', this.handleDropdownHidden);
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
      this.#state.isLoading = false;
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
    this.#state.isLoading = false;
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
    this.#state.isLoading = false;
    if (this.input.value === '') {
      this.#state.userList = [];
      this.#state.totalUsersCount = 0;
      this.#state.currentListLength = 0;
      this.listContainer.innerHTML = '';
    }
    this.cleanObserver();
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
      this.cleanObserver();
      this.listContainer.innerHTML = '';
      const newQuery = this.input.value.trim();
      if (newQuery !== '' && newQuery !== this.#state.searchQuery) {
        this.#state.searchQuery = newQuery;
        const fetchSuccess = await this.searchUser();
        if (fetchSuccess) {
          this.renderUserList();
        }
      } else {
        this.#state.searchQuery = '';
      }
      this.setupObserver();
    }, 500);
  }

  /**
   * @description
   * Handles the dropdown hidden event.
   * It clears the intersection observer, resets the search query, user list, and total user count.
   * It also clears the input field and the list container.
   * @returns {void}
   * @listens hidden.bs.dropdown
   */
  handleDropdownHidden() {
    this.cleanObserver();
    this.#state.isLoading = false;
    this.#state.searchQuery = '';
    this.#state.userList = [];
    this.#state.totalUsersCount = 0;
    this.listContainer.innerHTML = '';
    this.input.value = '';
  }

  /**
   * @description
   * Handles the IntersectionObserver entries to load more users when the user scrolls to the bottom of the list.
   * It checks if the total user count is greater than the current list length.
   * If so, it fetches more users and renders the list items.
   * If the observer is not intersecting or if the state is already loading, it returns early.
   * It also resets the observer and anchor element after loading more users.
   * @param {IntersectionObserverEntry[]} entries - The entries from the IntersectionObserver.
   * @returns {Promise<void>}
   * @listens intersectionobserver
   */
  async showMoreUsers(entries) {
    if (this.#state.totalUsersCount <= this.#state.currentListLength) {
      this.cleanObserver();
      return;
    }
    const entry = entries[0];
    if (!entry.isIntersecting || this.#state.isLoading) {
      return;
    }
    const fetchSuccess = await this.searchUser();
    if (!fetchSuccess) {
      return;
    }
    this.renderUserList();
    this.#observer.unobserve(this.#loadMoreAnchor);
    this.listContainer.appendChild(this.#loadMoreAnchor);
    this.#observer.observe(this.#loadMoreAnchor);
  }

  /**
   * @description
   * Searches for users based on the current search query.
   * It makes an API request to fetch users matching the search query.
   * If the request is successful, it updates the user list and renders the user list.
   * If the request fails, it displays a message indicating that the user search is temporarily unavailable.
   * @returns {Promise<boolean>} - true on fetch success, false on failure
   * @listens input
   */
  async searchUser() {
    if (this.#state.isLoading) {
      return false;
    }
    this.#state.isLoading = true;
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
      this.#state.isLoading = false;
      return false;
    }
    if (response.data) {
      this.#state.totalUsersCount = response.data.count;
      this.#state.userList.push(...response.data.items);
    }
    return true;
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

  /**
   * @description
   * Sets up the IntersectionObserver to lazy load more users when the user scrolls to the bottom of the list.
   * It creates a load more anchor element and observes it for intersection changes.
   * When the anchor is intersecting, it fetches more users data and renders the list items.
   * @returns {void}
   */
  setupObserver() {
    this.cleanObserver();

    this.#loadMoreAnchor = document.createElement('li');
    this.#loadMoreAnchor.classList.add('list-group-item', 'dropdown-list-item', 'p-0');
    this.listContainer.appendChild(this.#loadMoreAnchor);

    switch (this.#state.isMobile) {
      case false:
        this.#observer = new IntersectionObserver(this.showMoreUsers, {
          root: this.dropdown,
          rootMargin: '0px 0px 64px 0px',
          threshold: 0.1,
        });
        break;
      case true:
        this.#observer = new IntersectionObserver(this.showMoreUsers, {
          root: this.dropdownMobile,
          rootMargin: '0px 0px 64px 0px',
          threshold: 0.1,
        });
        break;
      default:
        break;
    }
    this.#observer.observe(this.#loadMoreAnchor);
  }

  cleanObserver() {
    if (this.#observer) {
      this.#observer.disconnect();
      this.#observer = null;
    }
    if (this.#loadMoreAnchor) {
      this.#loadMoreAnchor.parentNode?.removeChild(this.#loadMoreAnchor);
      this.#loadMoreAnchor = null;
    }
  }

  handleResize() {
    const isMobileWidth = isMobile();
    if (this.#state.isMobile !== isMobileWidth) {
      this.#state.isMobile = isMobileWidth;
      this.button?.removeEventListener('hidden.bs.dropdown', this.handleDropdownHidden);
      this.buttonMobile?.removeEventListener('hidden.bs.dropdown', this.handleDropdownHidden);
      this.form?.removeEventListener('click', this.clearUserList);
      this.form?.removeEventListener('submit', this.preventReloadBySubmit);
      this.input?.removeEventListener('click', this.clearUserList);
      this.input?.removeEventListener('input', this.handleInput);
      this.cleanObserver();
      this.render();
    }
  }

  /* ------------------------------------------------------------------------ */
  /*     Template & style                                                     */
  /* ------------------------------------------------------------------------ */
  template() {
    return `
    <form class="d-flex mx-3 mt-3 mb-2" role="search">
      <div class="input-group mt-2">
        <span class="input-group-text" id="basic-addon1"><i class="bi bi-search"></i></span>
        <input class="form-control" type="search" name="usersearch" placeholder="Find user(s)" aria-label="Search" autocomplete="off">
      </div>
    </form>
    <div class="ps-3 pe-2">
      <ul class="list-group mb-2" id="navbar-user-list"></ul>
    </div>
    `;
  }

  style() {
    return `
    <style>
    #navbar-user-list {
      overflow-y: auto;
      max-height: calc(75vh - 5rem);
    }
    </style>
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
