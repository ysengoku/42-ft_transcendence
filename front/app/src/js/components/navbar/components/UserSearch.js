import { apiRequest, API_ENDPOINTS } from '@api';
import { showAlertMessageForDuration, ALERT_TYPE, ERROR_MESSAGES } from '@utils';

export class UserSearch extends HTMLElement {
  #state = {
    searchQuery: '',
    userList: [],
    totalUsersCount: 0,
    currentListLength: 0,
    timeout: null,
    isLoading: false,
  }

  constructor() {
    super();

    this.clearUserList = this.clearUserList.bind(this);
    this.handleInput = this.handleInput.bind(this);
    this.handleDropdownHidden = this.handleDropdownHidden.bind(this);
    this.showMoreUsers = this.showMoreUsers.bind(this);
  }

  connectedCallback() {
    this.render();
  }

  disconnectedCallback() {
    this.button?.removeEventListener('hidden.bs.dropdown', this.handleDropdownHidden);
    this.form?.removeEventListener('click', this.clearUserList);
    this.input?.removeEventListener('click', this.clearUserList);
    this.input?.removeEventListener('input', this.handleInput);
    this.dropdown?.removeEventListener('scrollend', this.showMoreUsers);
    this.dropdownMobile?.removeEventListener('scrollend', this.showMoreUsers);
  }

  render() {
    this.innerHTML = this.template();

    this.listContainer = this.querySelector('#navbar-user-list');
    this.button = document.getElementById('navbar-user-search');
    this.dropdown = document.getElementById('user-search-dropdown');
    this.form = this.querySelector('form');

    this.button?.addEventListener('hidden.bs.dropdown', this.handleDropdownHidden);
    this.dropdown?.addEventListener('scrollend', this.showMoreUsers);

    this.form ? (
      this.form.addEventListener('click', this.clearUserList),
      this.input = this.form.querySelector('input')
    ) : (devErrorLog('User search form not found'));
    this.input ? (
      this.input.addEventListener('click', this.clearUserList),
      this.input.addEventListener('input', this.handleInput)
    ) : devErrorLog('User search input not found');

    this.buttonMobile = document.getElementById('dropdown-item-user-search');
    this.dropdownMobile = document.getElementById('dropdown-user-search');
    this.buttonMobile?.addEventListener('hidden.bs.dropdown', this.handleDropdownHidden);
    this.dropdownMobile?.addEventListener('scrollend', this.showMoreUsers);
  }

  clearUserList(event) {
    event?.stopPropagation();
    if (this.input.value === '') {
      this.#state.userList = [];
      this.totalUserCount = 0;
      this.#state.currentListLength = 0;
      this.listContainer.innerHTML = '';
    }
  }

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
    }
    , 500);
  }

  handleDropdownHidden() {
    this.#state.searchQuery = '';
    this.#state.userList = [];
    this.totalUserCount = 0;
    this.listContainer.innerHTML = '';
    this.input.value = '';
  }

  async showMoreUsers(event) {
    const { scrollTop, scrollHeight, clientHeight } = event.target;
    const threshold = 5;
    if (Math.ceil(scrollTop + clientHeight) < scrollHeight - threshold ||
    this.#state.totalUsersCount === this.#state.currentListLength || this.#state.isLoading) {
      return;
    }
    this.#state.isLoading = true;
    await this.searchUser();
    this.#state.isLoading = false;
  }

  async searchUser() {
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
        this.#state.totalUsersCount = response.data.count;
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
