import { apiRequest, API_ENDPOINTS } from '@api';
import { showAlertMessageForDuration, ALERT_TYPE, ERROR_MESSAGES } from '@utils';

export class UserSearch extends HTMLElement {
  constructor() {
    super();
    this.userList = [];
    this.totalUsersCount = 0;

    this.handleClick = this.handleClick.bind(this);
    this.handleInput = this.handleInput.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
    this.handleDropdownHidden = this.handleDropdownHidden.bind(this);
  }

  connectedCallback() {
    this.render();
  }

  disconnectedCallback() {
    this.input.removeEventListener('click', this.handleClick);
    this.input.removeEventListener('input', this.handleInput);
    this.form.removeEventListener('click', this.handleClick);
    this.form.removeEventListener('submit', this.handleSubmit);
    document.removeEventListener('hidden.bs.dropdown', this.handleDropdownHidden);
  }

  render() {
    this.innerHTML = this.template();

    this.listContainer = this.querySelector('#navbar-user-list');
    this.form = this.querySelector('form');
    this.input = this.form.querySelector('input');

    this.input.addEventListener('click', this.handleClick);
    this.input.addEventListener('input', this.handleInput);
    this.form.addEventListener('click', this.handleClick);
    this.form.addEventListener('submit', this.handleSubmit);
    document.addEventListener('hidden.bs.dropdown', this.handleDropdownHidden);
  }

  handleClick(event) {
    event.stopPropagation();
    if (this.input.value === '') {
      this.userList = [];
      this.totalUserCount = 0;
      this.listContainer.innerHTML = '';
    }
  }

  handleInput() {
    if (this.input.value === '') {
      this.userList = [];
      this.totalUserCount = 0;
      this.listContainer.innerHTML = '';
    }
  }

  async handleSubmit(event) {
    event.stopPropagation();
    event.preventDefault();
    const searchQuery = this.input.value;
    await this.searchUser(searchQuery);
  }

  handleDropdownHidden() {
    this.userList = [];
    this.totalUserCount = 0;
    this.listContainer.innerHTML = '';
    this.input.value = '';
  }

  async searchUser(searchQuery) {
    const listLength = this.userList.length;
    const response = await apiRequest(
        'GET',
        /* eslint-disable-next-line new-cap */
        API_ENDPOINTS.USER_SEARCH(searchQuery, 10, listLength),
        null,
        false,
        true,
    );
    if (response.success) {
      if (response.data) {
        this.totalUsersCount = response.data.count;
        this.userList.push(...response.data.items);
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

  renderUserList() {
    this.listContainer.innerHTML = '';
    if (this.userList.length === 0) {
      this.renderNoUserFound();
      return;
    }
    this.userList.forEach((user) => {
      const listItem = document.createElement('user-list-item');
      listItem.setAttribute('username', user.username);
      listItem.setAttribute('nickname', user.nickname);
      listItem.setAttribute('avatar', user.avatar);
      listItem.setAttribute('online', user.is_online);
      this.listContainer.appendChild(listItem);
    });
    if (this.totalUsersCount > this.userList.length) {
      this.renderShowMoreButton();
    }
  }

  renderNoUserFound() {
    const noUser = document.createElement('li');
    noUser.innerHTML = this.noUserFoundTemplate();
    this.listContainer.appendChild(noUser);
  }

  renderShowMoreButton() {
    const showMoreButton = document.createElement('li');
    showMoreButton.innerHTML = this.showMoreButtonTemplate();
    this.listContainer.appendChild(showMoreButton);

    const button = showMoreButton.querySelector('#show-more-users');
    if (button) {
      button.addEventListener('click', (event) => {
        event.stopPropagation();
        this.searchUser();
      });
    }
  }

  template() {
    return `
    <form class="d-flex mx-3 mt-3 mb-2" role="search" id="user-search-form">
      <div class="input-group">
        <span class="input-group-text" id="basic-addon1"><i class="bi bi-search"></i></span>
        <input class="form-control me-2" type="search" placeholder="Find user(s)" aria-label="Search">
      </div>
      <button class="btn btn-primary" type="submit">Search</button>
    </form>
    <div class="ps-3 pe-4">
        <ul class="list-group mb-2" id="navbar-user-list"></ul>
    </div>
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
      #show-more-users {
        border: none;
        position: relative;
        border-top: 1px solid var(--bs-border-color);
      }
      li {
        list-style-type: none;
      }
    </style>
    <div class="list-group-item mt-4 p-3" id="show-more-users">
      <p class="text-center m-0">Show more users</p>
    </div>
    `;
  }
}

customElements.define('user-search', UserSearch);
