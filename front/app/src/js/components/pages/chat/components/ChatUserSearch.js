import { apiRequest, API_ENDPOINTS } from '@api';
import { setupObserver } from '@utils';

export class ChatUserSearch extends HTMLElement {
  #state = {
    loggedinUsername: '',
    userList: [],
    totalUserCount: 0,
    currentListLength: 0,
    searchQuery: '',
    timeout: null,
    isLoading: false,
  };

  /**
   * @property {IntersectionObserver} observer - The IntersectionObserver instance for lazy loading.
   * @property {HTMLElement} loadMoreAnchor - The anchor element for loading more items.
   */
  observer = null;
  loadMoreAnchor = null;

  constructor() {
    super();

    this.loadMoreUsers = this.loadMoreUsers.bind(this);
    this.handleInput = this.handleInput.bind(this);
    this.hideUserSearch = this.hideUserSearch.bind(this);
    this.handleClick = this.handleClick.bind(this);
    this.preventReloadBySubmit = this.preventReloadBySubmit.bind(this);
  }

  set user(value) {
    this.#state.loggedinUsername = value;
    this.render();
  }

  disconnectedCallback() {
    this.cleanObserver();
    this.form?.removeEventListener('submit', this.preventReloadBySubmit);
    this.input?.removeEventListener('input', this.handleSubmit);
    this.searchBarToggleButton?.removeEventListener('click', this.hideUserSearch);
    document.removeEventListener('click', this.handleClick);
  }

  /* ------------------------------------------------------------------------ */
  /*     Render                                                               */
  /* ------------------------------------------------------------------------ */

  render() {
    this.innerHTML = this.style() + this.template();

    this.listContainer = this.querySelector('#chat-user-list');
    this.form = this.querySelector('#chat-user-search-form');
    this.input = this.querySelector('input');
    this.searchBarToggleButton = document.querySelector('.new-chat');

    this.form.addEventListener('submit', this.preventReloadBySubmit);
    this.input?.addEventListener('input', this.handleInput);
    this.searchBarToggleButton?.addEventListener('click', this.hideUserSearch);
    document.addEventListener('click', this.handleClick);
  }

  renderUserList() {
    if (
      this.#state.userList.length === 0 ||
      (this.#state.userList.length === 1 && this.#state.userList[0].username === this.#state.loggedinUsername)
    ) {
      this.renderNoUserFound();
      return;
    }
    for (let i = this.#state.currentListLength; i < this.#state.userList.length; i++) {
      if (this.#state.userList[i].username !== this.#state.loggedinUsername) {
        const listItem = document.createElement('chat-user-search-item');
        listItem.data = this.#state.userList[i];
        this.listContainer.appendChild(listItem);
      }
      this.#state.currentListLength++;
    }
  }

  renderNoUserFound() {
    const noUser = document.createElement('li');
    noUser.innerHTML = this.noUserFoundTemplate();
    this.listContainer.appendChild(noUser);
  }

  /* ------------------------------------------------------------------------ */
  /*     Event handlers                                                       */
  /* ------------------------------------------------------------------------ */

  async searchUsers() {
    const response = await apiRequest(
      'GET',
      /* eslint-disable-next-line new-cap */
      API_ENDPOINTS.USER_SEARCH(this.#state.searchQuery, 10, this.#state.currentListLength),
      null,
      false,
      true,
    );
    if (!response.success) {
      return;
    }
    if (response.data) {
      this.#state.totalUserCount = response.data.count;
      this.#state.userList.push(...response.data.items);
    }
  }

  async handleInput(event) {
    event.stopPropagation();
    event.preventDefault();

    clearTimeout(this.#state.timeout);
    this.#state.timeout = setTimeout(async () => {
      this.#state.userList = [];
      this.#state.totalUserCount = 0;
      this.#state.currentListLength = 0;
      this.listContainer.scrollTop = 0;
      this.cleanObserver();
      this.listContainer.classList.remove('show');
      this.listContainer.innerHTML = '';

      if (this.#state.searchQuery !== this.input.value && this.input.value !== '') {
        this.#state.searchQuery = this.input.value;
        await this.searchUsers();
        this.renderUserList();
        [this.observer, this.loadMoreAnchor] = setupObserver(this.listContainer, this.loadMoreUsers);
        this.listContainer.classList.add('show');
      } else {
        this.#state.searchQuery = '';
      }
    }, 500);
  }

  async loadMoreUsers(entries) {
    const entry = entries[0];
    if (
      !entry.isIntersecting ||
      this.#state.totalUserCount === this.#state.currentListLength ||
      this.#state.isLoading
    ) {
      return;
    }
    this.#state.isLoading = true;
    await this.searchUsers();
    this.renderUserList();
    this.observer.unobserve(this.loadMoreAnchor);
    this.listContainer.appendChild(this.loadMoreAnchor);
    this.observer.observe(this.loadMoreAnchor);
    this.#state.isLoading = false;
  }

  hideUserSearch() {
    this.input.value = '';
    this.#state.currentListLength = 0;
    this.#state.totalUserCount = 0;
    this.listContainer.scrollTop = 0;
    this.cleanObserver();
    this.#state.searchQuery = '';
    this.#state.userList = [];
    this.listContainer.innerHTML = '';
    this.listContainer.classList.remove('show');
  }

  handleClick(event) {
    event.stopPropagation();
    if (this.listContainer.contains(event.target) || this.input.contains(event.target)) {
      return;
    }
    this.listContainer.scrollTop = 0;
    this.cleanObserver();
    this.listContainer.classList.remove('show');
    this.input.value = '';
    this.listContainer.innerHTML = '';
    this.#state.currentListLength = 0;
    this.#state.totalUserCount = 0;
    this.#state.searchQuery = '';
    this.#state.userList = [];
  }

  cleanObserver() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    if (this.loadMoreAnchor) {
      this.loadMoreAnchor.parentNode?.removeChild(this.loadMoreAnchor);
      this.loadMoreAnchor = null;
    }
  }

  preventReloadBySubmit(event) {
    event.preventDefault();
  }

  /* ------------------------------------------------------------------------ */
  /*     Template & style                                                     */
  /* ------------------------------------------------------------------------ */

  template() {
    return `
    <div class="me-3 d-none" id="chat-user-search">
      <form class="d-flex me-3 mt-3" role="search" id="chat-user-search-form">
        <div class="input-group position-relative mt-2">
          <span class="input-group-text" id="basic-addon1"><i class="bi bi-search"></i></span>
          <input class="form-control" type="search" placeholder="Find user(s)" aria-label="Search">
          <ul class="dropdown-menu position-absolute w-100 overflow-auto" id="chat-user-list"></ul>
        </div>
      </form>
    </div>
    `;
  }

  style() {
    return `
    <style>
    #chat-user-list {
      max-height: 400px;
      border: none;
      top: 100%;
    }
    </style>
    `;
  }

  noUserFoundTemplate() {
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

customElements.define('chat-user-search', ChatUserSearch);
