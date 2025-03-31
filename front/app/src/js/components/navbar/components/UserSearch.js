import { apiRequest, API_ENDPOINTS } from '@api';
import { showAlertMessageForDuration, ALERT_TYPE, ERROR_MESSAGES } from '@utils';

export class UserSearch extends HTMLElement {
  constructor() {
    super();
    this.searchQuery = '';
    this.userList = [];
    this.totalUsersCount = 0;
    this.currentListLength = 0;

    this.handleClick = this.handleClick.bind(this);
    this.handleInput = this.handleInput.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
    this.handleDropdownHidden = this.handleDropdownHidden.bind(this);
    this.showMoreUsers = this.showMoreUsers.bind(this);
  }

  connectedCallback() {
    this.render();
  }

  disconnectedCallback() {
    this.input?.removeEventListener('click', this.handleClick);
    this.input?.removeEventListener('input', this.handleInput);
    this.form?.removeEventListener('click', this.handleClick);
    this.form?.removeEventListener('submit', this.handleSubmit);
    this.dropdown?.removeEventListener('scrollend', this.showMoreUsers);
    document.removeEventListener('hidden.bs.dropdown', this.handleDropdownHidden);
  }

  render() {
    this.innerHTML = this.template();

    this.listContainer = this.querySelector('#navbar-user-list');
    this.form = this.querySelector('form');
    this.input = this.form.querySelector('input');
    this.dropdown = document.getElementById('user-search-dropdown');

    this.form.addEventListener('click', this.handleClick);
    this.form.addEventListener('submit', this.handleSubmit);
    this.input.addEventListener('click', this.handleClick);
    this.input.addEventListener('input', this.handleInput);
    this.dropdown.addEventListener('scrollend', this.showMoreUsers);
    document.addEventListener('hidden.bs.dropdown', this.handleDropdownHidden);
  }

  handleClick(event) {
    event.stopPropagation();
    if (this.input.value === '') {
      this.userList = [];
      this.totalUserCount = 0;
      this.currentListLength = 0;
      this.listContainer.innerHTML = '';
    }
    this.showMoreButton?.removeEventListener('click', this.showMoreUsers);
  }

  handleInput() {
    if (this.input.value === '') {
      this.userList = [];
      this.totalUserCount = 0;
      this.currentListLength = 0;
      this.listContainer.innerHTML = '';
      this.showMoreButton?.removeEventListener('click', this.showMoreUsers);
    }
  }

  async handleSubmit(event) {
    event.stopPropagation();
    event.preventDefault();
    this.searchQuery = this.input.value;
    this.listContainer.innerHTML = '';
    await this.searchUser(this.searchQuery);
  }

  handleDropdownHidden() {
    this.searchQuery = '';
    this.userList = [];
    this.totalUserCount = 0;
    this.listContainer.innerHTML = '';
    this.input.value = '';
    this.showMoreButton?.removeEventListener('click', this.showMoreUsers);
  }

  async showMoreUsers(event) {
    const { scrollTop, scrollHeight, clientHeight } = event.target;
    const threshold = 5;
    if (Math.ceil(scrollTop + clientHeight) < scrollHeight - threshold ||
    this.totalUsersCount === this.currentListLength) {
      return;
    }
    this.searchUser();
  }

  async searchUser() {
    const response = await apiRequest(
        'GET',
        /* eslint-disable-next-line new-cap */
        API_ENDPOINTS.USER_SEARCH(this.searchQuery, 10, this.currentListLength),
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
    if (this.userList.length === 0) {
      this.renderNoUserFound();
      return;
    }
    for (let i = this.currentListLength; i < this.userList.length; i++) {
      const listItem = document.createElement('user-list-item');
      listItem.data = this.userList[i];
      if (i === 0) {
        const firstItem = listItem.querySelector('.list-group-item');
        firstItem.classList.add('border-top-0');
      }
      this.listContainer.appendChild(listItem);
      this.currentListLength++;
    }
  }

  renderNoUserFound() {
    const noUser = document.createElement('li');
    noUser.innerHTML = this.noUserFoundTemplate();
    this.listContainer.appendChild(noUser);
  }

  template() {
    return `
    <form class="d-flex mx-3 mt-3 mb-2" role="search" id="user-search-form">
      <div class="input-group mt-2">
        <span class="input-group-text" id="basic-addon1"><i class="bi bi-search"></i></span>
        <input class="form-control" type="search" placeholder="Find user(s)" aria-label="Search">
      </div>
      <button class="search-submit-btn btn mt-2" type="submit">Search</button>
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
}

customElements.define('user-search', UserSearch);
