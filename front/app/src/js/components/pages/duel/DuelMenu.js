import { router } from '@router';
import { apiRequest, API_ENDPOINTS } from '@api';
import { auth } from '@auth';
import anonymousAvatar from '/img/anonymous-avatar.png?url';

export class DuelMenu extends HTMLElement {
  #state = {
    user: null,
    opponentUsername: '',
  };

  #usersearch = {
    searchQuery: '',
    list: [],
    totalUsersCount: 0,
    currentListLength: 0,
    searchTimeout: null,
    isLoading: false,
  }

  constructor() {
    super();

    this.handleSearchInput = this.handleSearchInput.bind(this);
    this.loadMoreUsers = this.loadMoreUsers.bind(this);
    this.selectOpponent = this.selectOpponent.bind(this);
    this.inviteToDuel = this.inviteToDuel.bind(this);
    this.requestMatchMaking = this.requestMatchMaking.bind(this);
  }

  connectedCallback() {
    this.#state.user = auth.getStoredUser();
    if (!this.#state.user) {
      router.navigate('/login');
      return;
    }
    this.render();
  }

  disconnectedCallback() {
    this.searchInput?.removeEventListener('input', this.handleSearchInput);
    this.userList?.removeEventListener('scrollend', this.loadMoreUsers);
    this.inviteButton?.removeEventListener('click', this.inviteToDuel);
    this.requestMatchmakingButton?.removeEventListener('click', this.requestMatchMaking);
    this.userList?.querySelectorAll('li').forEach((item) => {
      item.removeEventListener('click', this.selectOpponent);
    });
  }

  /* ------------------------------------------------------------------------ */
  /*      Rendering                                                           */
  /* ------------------------------------------------------------------------ */
  render() {
    this.innerHTML = this.template() + this.style();

    this.searchInput = this.querySelector('input');
    this.userList = this.querySelector('#duel-user-list');
    this.opponentNickname = this.querySelector('.opponent-nickname');
    this.opponentUsername = this.querySelector('.opponent-username');
    this.opponentElo = this.querySelector('.opponent-elo');
    this.opponentAvatar = this.querySelector('.opponent-avatar');
    this.opponentOnlineStatus = this.querySelector('.opponent-status-indicator');
    this.inviteButton = this.querySelector('#invite-button');
    this.requestMatchmakingButton = this.querySelector('#request-matchmaking-button');

    this.opponentAvatar.src = anonymousAvatar;

    this.searchInput.addEventListener('input', this.handleSearchInput);
    this.inviteButton.addEventListener('click', this.inviteToDuel);
    this.requestMatchmakingButton.addEventListener('click', this.requestMatchMaking);
    this.userList.addEventListener('scrollend', this.loadMoreUsers);
  }

  renderUserList() {
    // if (this.#usersearch.list.length === 0) {
    //   this.renderNoUserFound();
    //   return;
    // }
    for (let i = this.#usersearch.currentListLength; i < this.#usersearch.list.length; i++) {
      if (this.#usersearch.list[i].username !== this.#state.user.username) {
        this.renderUserListItem(this.#usersearch.list[i]);
      }
    }
    this.#usersearch.currentListLength = this.#usersearch.list.length;
    this.userList.classList.add('show');
  }

  renderUserListItem(user) {
    const item = document.createElement('div');
    item.innerHTML = this.userListItemTemplate();

    const avatar = item.querySelector('.duel-usersearch-avatar');
    const statusIndicator = item.querySelector('.duel-usersearch-status-indicator');
    const nickname = item.querySelector('.duel-usersearch-nickname');
    const username = item.querySelector('.duel-usersearch-username');
    const elo = item.querySelector('.duel-usersearch-elo');

    avatar.src = user.avatar;
    if (user.is_online) {
      statusIndicator.classList.add('online');
    }
    nickname.textContent = user.nickname;
    username.textContent = `@${user.username}`;
    elo.textContent = `Elo ${user.elo}`;
    this.userList.appendChild(item);
    item.addEventListener('click', this.selectOpponent);
  }

  renderNoUserFound() {
    const noUser = document.createElement('li');
    noUser.textContent = 'No user found';
    this.userList.appendChild(noUser);
    this.userList.classList.add('show');
  }

  /* ------------------------------------------------------------------------ */
  /*      Event handling                                                      */
  /* ------------------------------------------------------------------------ */
  async handleSearchInput(event) {
    event.preventDefault();
    event.stopPropagation();
    clearTimeout(this.#usersearch.searchTimeout);
    this.#usersearch.searchTimeout = setTimeout( async() => {
      this.#usersearch.list = [];
      this.#usersearch.totalUsersCount = 0;
      this.#usersearch.currentListLength = 0;
      this.userList.innerHTML = '';
      this.userList.classList.remove('show');
      if (this.#usersearch.searchQuery !== event.target.value && event.target.value.length > 0) {
        this.#usersearch.searchQuery = event.target.value;
        await this.searchUser();
      } else {
        this.#usersearch.searchQuery = '';
      }
    }, 500);
  }

  async searchUser() {
    const response = await apiRequest(
      'GET',
      /* eslint-disable-next-line new-cap */
      API_ENDPOINTS.USER_SEARCH(this.#usersearch.searchQuery, 10, this.#usersearch.currentListLength),
      null,
      false,
      true,
    );
    if (response.success) {
      if (response.data) {
        if (response.data.count === 0) {
          this.renderNoUserFound();
          return;
        }
        this.#usersearch.list.push(...response.data.items);
        this.#usersearch.totalUsersCount = response.data.count;
        this.renderUserList();
      }
    } else {
        // TODO: Handle error
    }
  }

  async loadMoreUsers(event) {
    const { scrollTop, scrollHeight, clientHeight } = event.target;
    const threshold = 5;
    if (Math.ceil(scrollTop + clientHeight) < scrollHeight - threshold ||
      this.#usersearch.totalUsersCount === this.#usersearch.currentListLength ||
      this.#usersearch.isLoading) {
      return;
    }
    this.#usersearch.isLoading = true;
    await this.searchUser();
    this.#usersearch.isLoading = false;
  }

  selectOpponent(event) {
    const selectedUser = event.currentTarget;
    const avatar = selectedUser.querySelector('.duel-usersearch-avatar').src;
    const nickname = selectedUser.querySelector('.duel-usersearch-nickname').textContent;
    const username = selectedUser.querySelector('.duel-usersearch-username').textContent;
    const elo = selectedUser.querySelector('.duel-usersearch-elo').textContent;
    
    this.opponentAvatar.src = avatar;
    this.opponentNickname.textContent = nickname;
    this.opponentUsername.textContent = username;
    this.opponentElo.textContent = elo;
    
    const onlineStatusIndicator = selectedUser.querySelector('.duel-usersearch-status-indicator');
    const online = onlineStatusIndicator.classList.contains('online');
    online ?
      this.opponentOnlineStatus.classList.add('online') :
      this.opponentOnlineStatus.classList.remove('online');
    this.opponentOnlineStatus.classList.remove('d-none');

    this.userList.innerHTML = '';
    this.userList.classList.remove('show');
    this.#usersearch.list = [];
    this.#usersearch.currentListLength = 0;
    this.#usersearch.searchQuery = '';
    this.searchInput.value = '';

    this.#state.opponentUsername = username;
  }

  async inviteToDuel(event) {
    event.preventDefault();
  }

  async requestMatchMaking(event) {
    event.preventDefault();
  }

  template() {
    return `
      <div class="container">
        <div class="row justify-content-center py-4">
          <div class="form-container col-12 col-sm-10 col-md-8 col-lg-6 col-xl-5 p-4">
            <div class="d-flex justify-content-center w-100">
              <form class="w-75">
                <legend class="my=3">Choose your opponent</legend>
                <div class="input-group position-relative mt-2">
                  <span class="input-group-text" id="basic-addon1"><i class="bi bi-search"></i></span>
                  <input class="form-control" type="search" placeholder="Find user" aria-label="Search">
                  <ul class="dropdown-menu position-absolute px-3 w-100" id="duel-user-list"></ul>
                </div>       

                <div class="d-flex flex-column align-items-center w-100 my-4 p-3">
                  <div class="d-flex flex-row align-items-center gap-3">
                    <p class="opponent-nickname m-0 fs-4 fw-bolder text-break"></p>
                    <p class="opponent-username m-0 text-break"></p>
                  </div>
                  <span class="opponent-elo badge ms-2 my-1"></span>
                  <div class="position-relative d-inline-block mt-2">
                    <img class="opponent-avatar" />
                    <span class="online-status opponent-status-indicator position-absolute ms-3 d-none"></span>
                  </div>
                </div>

                <button type="submit" id="invite-button" class="btn btn-wood btn-lg w-100">Send a challenge</button>

                <div class="d-flex align-items-center w-100 w-100 my-2 py-3">
                  <hr class="flex-grow-1">
                  <span class="mx-2">OR</span>
                  <hr class="flex-grow-1">
                </div>

                <legend class="my-3">Let us pick your opponent</legend>
                <button type="submit" id="request-matchmaking-button" class="btn btn-wood btn-lg w-100">Find me a duel</button>
              </form>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  style() {
    return `
    <style>
    #duel-user-list {
      min-width: 280px;
      max-height: 320px;
      top: 100%;
    }
    .duel-usersearch-avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      object-fit: cover;
    }
    .duel-usersearch-status-indicator {
      bottom: -2px;
      right: -2px;
      border: 1px solid var(--bs-body-bg);
      width: 12px;
      height: 12px;
    }
    .duel-usersearch-user-info
    .duel-usersearch-username {
      min-width: 0;
    }
    .badge {
      background-color: var(--pm-primary-500);
    }
    .opponent-avatar {
      width: 120px;
      height: 120px;
      border-radius: 50%;
      object-fit: cover;
    }
    .opponent-status-indicator {
      bottom: 2%;
      right: 4%;
      width: 20px;
      height: 20px;
    }
    </style>`;
  }

  userListItemTemplate() {
    return `
    <li class="dropdown-item px-4 pt-3 pb-4">
      <div class="d-flex flex-row align-items-center">
        <div class="position-relative d-inline-block me-3">
          <img class="duel-usersearch-avatar mt-1" />
          <span class="online-status duel-usersearch-status-indicator position-absolute ms-3"></span>
        </div>
        <div class="duel-usersearch-user-info d-flex flex-column flex-shrink-1 text-truncate">
          <p class="duel-usersearch-nickname m-0 fw-bolder text-truncate"></p>
          <div class="d-flex flex-row justify-content-between align-items-center gap-1">
            <p class="duel-usersearch-username m-0 text-truncate"></p>
            <span class="duel-usersearch-elo badge ms-2 mt-1"></span>
          </div>
        </div>
      </div>
    </li>
    `;
  }
}

customElements.define('duel-menu', DuelMenu);
