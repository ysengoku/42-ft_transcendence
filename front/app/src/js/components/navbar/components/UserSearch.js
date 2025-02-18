import { apiRequest, API_ENDPOINTS } from '@api';

export class UserSearch extends HTMLElement {
  constructor() {
    super();
    this.userList = [];
    this.totalUsersCount = 0;
  }

  connectedCallback() {
    this.render();
    this.setupSearchHandler();
  }

  setupSearchHandler() {
    const form = this.querySelector('form');
    const input = form.querySelector('input');
    input.addEventListener('click', (event) => {
      event.stopPropagation();
    });
    input.addEventListener('input', () => {
      if (input.value === '') {
        this.userList = [];
        this.totalUserCount = 0;
        const listContainer = this.querySelector('#navbar-user-list');
        listContainer.innerHTML = '';
      }
    });
    form.addEventListener('submit', async (event) => {
      event.stopPropagation();
      event.preventDefault();
      const searchQuery = form.querySelector('input').value;
      await this.searchUser(searchQuery);
    });
    form.addEventListener('click', (event) => {
      event.stopPropagation();
    });
    document.addEventListener('hidden.bs.dropdown', () => {
      input.value = '';
    });
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
        showErrorMessageForDuration(ERROR_MESSAGES.SESSION_EXPIRED, 5000);
        router.navigate('/login');
      } else {
        showErrorMessageForDuration(ERROR_MESSAGES.UNKNOWN_ERROR, 5000);
        router.navigate('/');
      }
    }
  }

  render() {
    this.innerHTML = `
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

    document.addEventListener('hidden.bs.dropdown', () => {
      this.userList = [];
      this.totalUserCount = 0;
      const listContainer = this.querySelector('#navbar-user-list');
      listContainer.innerHTML = '';
    });
  }

  renderUserList() {
    const listContainer = this.querySelector('#navbar-user-list');
    listContainer.innerHTML = '';
    if (this.userList.length === 0) {
      this.renderNoUserFound(listContainer);
      return;
    }
    this.userList.forEach((user) => {
      const listItem = document.createElement('user-list-item');
      listItem.setAttribute('username', user.username);
      listItem.setAttribute('nickname', user.nickname);
      listItem.setAttribute('avatar', user.avatar);
      listItem.setAttribute('online', user.is_online);
      listContainer.appendChild(listItem);
    });
    if (this.totalUsersCount > this.userList.length) {
      this.renderShowMoreButton(listContainer);
    }
  }

  renderNoUserFound(listContainer) {
    const noUser = document.createElement('li');
    noUser.innerHTML = `
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
    listContainer.appendChild(noUser);
  }

  renderShowMoreButton(listContainer) {
    const showMoreButton = document.createElement('li');
    showMoreButton.innerHTML = `
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
    listContainer.appendChild(showMoreButton);

    const button = showMoreButton.querySelector('#show-more-users');
    if (button) {
      button.addEventListener('click', (event) => {
        event.stopPropagation();
        this.searchUser();
      });
    }
  }
}

customElements.define('user-search', UserSearch);
