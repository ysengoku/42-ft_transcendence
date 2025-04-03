import { apiRequest, API_ENDPOINTS } from '@api';
import { showAlertMessageForDuration, ALERT_TYPE, ERROR_MESSAGES } from '@utils';

export class ChatUserSearch extends HTMLElement {
  #state = {
    loggedinUsername: '',
    userList: [],
    totalUserCount: 0,
    currentListLength: 0,
    searchQuery: '',
  };

  constructor() {
    super();

    this.handleSubmit = this.handleSubmit.bind(this);
    this.loadMoreUsers = this.loadMoreUsers.bind(this);
    this.handleInput = this.handleInput.bind(this);
    this.hideUserSearch = this.hideUserSearch.bind(this);
  }

  set user(value) {
    this.#state.loggedinUsername = value;
    this.render();
  }

  disconnectedCallback() {
    this.submitButton?.removeEventListener('click', this.handleSubmit);
    this.input?.removeEventListener('input', this.handleInput);
    this.searchBarToggleButton?.removeEventListener('click', this.hideUserSearch);
    this.listContainer?.removeEventListener('scrollend', this.loadMoreUsers);
  }

  /* ------------------------------------------------------------------------ */
  /*     Render                                                               */
  /* ------------------------------------------------------------------------ */

  render() {
    this.innerHTML = this.template() + this.style();

    this.listContainer = this.querySelector('#chat-user-list');
    this.submitButton = this.querySelector('.search-submit-btn');
    this.input = this.querySelector('input');
    this.searchBarToggleButton = document.querySelector('.new-chat');

    this.submitButton.addEventListener('click', this.handleSubmit);
    this.input.addEventListener('input', this.handleInput);
    this.searchBarToggleButton.addEventListener('click', this.hideUserSearch);
    this.listContainer.addEventListener('scrollend', this.loadMoreUsers);
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
        if (i === 0) {
          const firstItem = listItem.querySelector('.list-group-item');
          firstItem.classList.add('border-top-0');
        }
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

  async handleSubmit(event) {
    event.stopPropagation();
    event.preventDefault();
    this.#state.searchQuery = this.input.value;
    this.listContainer.innerHTML = '';
    await this.searchUsers(this.searchQuery);
  }

  async loadMoreUsers(event) {
    const { scrollTop, scrollHeight, clientHeight } = event.target;
    const threshold = 5;
    if (Math.ceil(scrollTop + clientHeight) < scrollHeight - threshold ||
      this.#state.totalUserCount === this.#state.currentListLength) {
      return;
    }
    this.searchUsers();
  }

  handleInput() {
    this.#state.userList = [];
    this.#state.totalUserCount = 0;
    this.#state.currentListLength = 0;
    this.listContainer.innerHTML = '';
  }

  hideUserSearch() {
    this.searchQuery = '';
    this.userList = [];
    this.totalUserCount = 0;
    this.input.value = '';
    this.listContainer.innerHTML = '';
  }

  /* ------------------------------------------------------------------------ */
  /*     Template & style                                                     */
  /* ------------------------------------------------------------------------ */

  template() {
    return `
    <div class="me-3 d-none" id="chat-user-search">
      <form class="d-flex me-3 mt-3" role="search" id="chat-user-search-form">
        <div class="input-group mt-2">
          <span class="input-group-text" id="basic-addon1"><i class="bi bi-search"></i></span>
          <input class="form-control" type="search" placeholder="Find user(s)" aria-label="Search">
        </div>
        <button class="search-submit-btn btn mt-2 pe-0" type="submit">Search</button>
      </form>
      <div class="me-3 mb-3">
        <ul class="list-group mb-2 overflow-auto" id="chat-user-list"></ul>
      </div>
    </div>
    `;
  }

  style() {
    return `
    <style>
    #chat-user-list {
      max-height: 50vh;
      border: none;
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
