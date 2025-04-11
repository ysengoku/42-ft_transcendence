import { apiRequest, API_ENDPOINTS } from '@api';
import { showAlertMessageForDuration, ALERT_TYPE, ERROR_MESSAGES } from '@utils';

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

  constructor() {
    super();

    this.loadMoreUsers = this.loadMoreUsers.bind(this);
    this.handleInput = this.handleInput.bind(this);
    this.hideUserSearch = this.hideUserSearch.bind(this);
    this.handleClick = this.handleClick.bind(this);
  }

  set user(value) {
    this.#state.loggedinUsername = value;
    this.render();
  }

  disconnectedCallback() {
    this.input?.removeEventListener('input', this.handleSubmit);
    this.searchBarToggleButton?.removeEventListener('click', this.hideUserSearch);
    this.listContainer?.removeEventListener('scrollend', this.loadMoreUsers);
    document.removeEventListener('click', this.handleClick);
  }

  /* ------------------------------------------------------------------------ */
  /*     Render                                                               */
  /* ------------------------------------------------------------------------ */

  render() {
    this.innerHTML = this.template() + this.style();

    this.listContainer = this.querySelector('#chat-user-list');
    this.input = this.querySelector('input');
    this.searchBarToggleButton = document.querySelector('.new-chat');

    this.input?.addEventListener('input', this.handleInput);
    this.searchBarToggleButton?.addEventListener('click', this.hideUserSearch);
    this.listContainer?.addEventListener('scrollend', this.loadMoreUsers);
    document.addEventListener('click', this.handleClick);
  }

  renderUserList() {
    if (this.#state.userList.length === 0 ||
      (this.#state.userList.length === 1 && this.#state.userList[0].username === this.#state.loggedinUsername)) {
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
    if (response.success) {
      if (response.data) {
        this.#state.totalUserCount = response.data.count;
        this.#state.userList.push(...response.data.items);
      }
      this.renderUserList();
      this.listContainer.classList.add('show');
    } else {
      if (response.status === 401) {
        showAlertMessageForDuration(ALERT_TYPE.LIGHT, ERROR_MESSAGES.SESSION_EXPIRED, 5000);
        router.navigate('/login');
      } else {
        showAlertMessageForDuration(ALERT_TYPE.ERROR, ERROR_MESSAGES.UNKNOWN_ERROR, 5000);
        router.navigate('/');
      }
    }
  }

  async handleInput(event) {
    event.stopPropagation();
    event.preventDefault();

   clearTimeout(this.#state.timeout);
    this.#state.timeout = setTimeout( async () => {
      this.#state.userList = [];
      this.#state.totalUserCount = 0;
      this.#state.currentListLength = 0;
      this.listContainer.innerHTML = '';
      this.listContainer.classList.remove('show');

      if (this.#state.searchQuery !== this.input.value && this.input.value !== '') {
        this.#state.searchQuery = this.input.value;
        await this.searchUsers();
      } else {
        this.#state.searchQuery = '';
      }
    }, 500);
  }

  async loadMoreUsers(event) {
    const { scrollTop, scrollHeight, clientHeight } = event.target;
    const threshold = 5;
    if (Math.ceil(scrollTop + clientHeight) < scrollHeight - threshold ||
    this.#state.totalUserCount === this.#state.currentListLength || this.#state.isLoading) {
      return;
    }
    this.#state.isLoading = true;
    await this.searchUsers();
    this.#state.isLoading = false;
  }

  hideUserSearch() {
    this.input.value = '';
    this.#state.currentListLength = 0;
    this.#state.totalUserCount = 0;
    this.#state.searchQuery = '';
    this.#state.userList = [];
    this.listContainer.innerHTML = '';
    this.listContainer.classList.remove('show');
  }

  handleClick(event) {
    event.stopPropagation();
    if (!this.listContainer.contains(event.target)) {
      this.listContainer.classList.remove('show');
      this.input.value = '';
      this.listContainer.innerHTML = '';
      this.#state.currentListLength = 0;
      this.#state.totalUserCount = 0;
      this.#state.searchQuery = '';
      this.#state.userList = [];
    }
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
          <ul class="dropdown-menu position-absolute w-100" id="chat-user-list"></ul>
        </div>
      </form>
    </div>
    `;
  }

  style() {
    return `
    <style>
    #chat-user-list {
      max-height: 50vh;
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
