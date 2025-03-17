import { apiRequest, API_ENDPOINTS } from '@api';
import { showAlertMessageForDuration, ALERT_TYPE, ERROR_MESSAGES } from '@utils';

export class ChatUserSearch extends HTMLElement {
  #state = {
    userList: [],
    totalUserCount: 0,
    currentListLength: 0,
    searchQuery: '',
  };

  constructor() {
    super();

    this.handleSubmit = this.handleSubmit.bind(this);
    this.handleShowMoreUsers = this.handleShowMoreUsers.bind(this);
    this.handleInput = this.handleInput.bind(this);
    this.handleHideUserSearch = this.handleHideUserSearch.bind(this);
  }

  connectedCallback() {
    this.render();
  }

  disconnectedCallback() {
    this.submitButton?.removeEventListener('click', this.handleSubmit);
    this.input?.removeEventListener('input', this.handleInput);
    this.searchBarToggleButton?.removeEventListener('click', this.handleHideUserSearch);
    this.showMoreButton?.removeEventListener('click', this.handleShowMoreUsers);
  }

  render() {
    this.innerHTML = this.template() + this.style();

    this.listContainer = this.querySelector('#chat-user-list');
    this.submitButton = this.querySelector('.search-submit-btn');
    this.input = this.querySelector('input');
    this.searchBarToggleButton = document.querySelector('.new-chat');

    this.submitButton.addEventListener('click', this.handleSubmit);
    this.input.addEventListener('input', this.handleInput);
    this.searchBarToggleButton.addEventListener('click', this.handleHideUserSearch);
  }

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

  handleInput() {
    if (this.input.value === '') {
      this.#state.userList = [];
      this.#state.totalUserCount = 0;
      this.#state.currentListLength = 0;
      this.showMoreButton?.removeEventListener('click', this.handleShowMoreUsers);
      this.listContainer.innerHTML = '';
    }
  }

  handleHideUserSearch() {
    this.searchQuery = '';
    this.userList = [];
    this.totalUserCount = 0;
    this.input.value = '';
    this.showMoreButton?.removeEventListener('click', this.handleShowMoreUsers);
    this.listContainer.innerHTML = '';
  }

  async handleShowMoreUsers(event) {
    event.stopPropagation();
    this.searchUsers();
    this.showMoreButton?.removeEventListener('click', this.handleShowMoreUsers);
    this.showMoreButton?.remove();
  }

  renderUserList() {
    if (this.#state.userList.length === 0) {
      this.renderNoUserFound();
      return;
    }
    for (let i = this.#state.currentListLength; i < this.#state.userList.length; i++) {
      const listItem = document.createElement('chat-user-search-item');
      listItem.data = this.#state.userList[i];
      if (i === 0) {
        const firstItem = listItem.querySelector('.list-group-item');
        firstItem.classList.add('border-top-0');
      }
      this.listContainer.appendChild(listItem);
      this.#state.currentListLength++;
    }
    if (this.#state.totalUserCount > this.#state.currentListLength) {
      this.renderShowMoreButton();
    }
  }

  renderNoUserFound() {
    const noUser = document.createElement('li');
    noUser.innerHTML = this.noUserFoundTemplate();
    this.listContainer.appendChild(noUser);
  }

  renderShowMoreButton() {
    this.showMoreButtonContainer = document.createElement('li');
    this.showMoreButtonContainer.innerHTML = this.showMoreButtonTemplate();
    this.listContainer.appendChild(this.showMoreButtonContainer);

    this.showMoreButton = this.showMoreButtonContainer.querySelector('#chat-show-more-users');
    this.showMoreButton?.addEventListener('click', this.handleShowMoreUsers);
  }

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

  showMoreButtonTemplate() {
    return `
    <style>
    #chat-show-more-users {
      border: none;
      position: relative;
      border-top: 1px solid var(--bs-border-color);
    }
    li {
      list-style-type: none;
    }
    </style>
    <div class="list-group-item mt-4 p-3" id="chat-show-more-users">
      <p class="text-center m-0">Show more users</p>
    </div>
    `;
  }
}

customElements.define('chat-user-search', ChatUserSearch);
