import { Modal } from 'bootstrap';
import { router } from '@router';
import { apiRequest, API_ENDPOINTS } from '@api';
import { auth } from '@auth';
import { showAlertMessageForDuration, ALERT_TYPE } from '@utils';
import './components/GameOptionsModal.js';
import anonymousAvatar from '/img/anonymous-avatar.png?url';

export class DuelMenu extends HTMLElement {
  #state = {
    user: null,
    opponentUsername: '',
    options: null,
  };

  #usersearch = {
    searchQuery: '',
    list: [],
    totalUsersCount: 0,
    currentListLength: 0,
    searchTimeout: null,
    isLoading: false,
  };

  constructor() {
    super();

    this.gameOptionsModal = null;
    this.openGameOptionsModal = this.openGameOptionsModal.bind(this);
    this.closeGameOptionsModal = this.closeGameOptionsModal.bind(this);
    this.saveSelectedOptions = this.saveSelectedOptions.bind(this);
    this.handleSearchInput = this.handleSearchInput.bind(this);
    this.loadMoreUsers = this.loadMoreUsers.bind(this);
    this.hideUserList = this.hideUserList.bind(this);
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
    this.optionsButton?.removeEventListener('click', this.openGameOptionsModal);
    this.searchInput?.removeEventListener('input', this.handleSearchInput);
    this.userList?.removeEventListener('scrollend', this.loadMoreUsers);
    document.removeEventListener('click', this.hideUserList);
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

    this.optionsButton = this.querySelector('#game-options-button');
    this.gameOptionsModal = this.querySelector('game-options-modal');

    this.searchInput = this.querySelector('input');
    this.userList = this.querySelector('#duel-user-list');
    this.inviteButton = this.querySelector('#invite-button');
    this.requestMatchmakingButton = this.querySelector('#request-matchmaking-button');

    this.opponentNickname = this.querySelector('.opponent-nickname');
    this.opponentUsername = this.querySelector('.opponent-username');
    this.opponentElo = this.querySelector('.opponent-elo');
    this.opponentAvatar = this.querySelector('.opponent-avatar');
    this.opponentOnlineStatus = this.querySelector('.opponent-status-indicator');

    this.opponentAvatar.src = anonymousAvatar;

    this.optionsButton.addEventListener('click', this.openGameOptionsModal);
    this.searchInput.addEventListener('input', this.handleSearchInput);
    document.addEventListener('click', this.hideUserList);
    this.inviteButton.addEventListener('click', this.inviteToDuel);
    this.requestMatchmakingButton.addEventListener('click', this.requestMatchMaking);
    this.userList.addEventListener('scrollend', this.loadMoreUsers);
  }

  renderUserList() {
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
  openGameOptionsModal() {
    const template = document.createElement('template');
    template.innerHTML = this.gameOptionsModalTemplate();
    this.modalElement = template.content.querySelector('.modal');
    document.body.appendChild(this.modalElement);
    this.gameOptionsModal = new Modal(this.modalElement);
    if (!this.gameOptionsModal) {
      // TODO: handle error
      return;
    }
    const modalBody = this.modalElement.querySelector('.modal-body');
    this.modalBodyContent = document.createElement('game-options');
    this.modalBodyContent.selectedOptions = this.#state.options;
    modalBody.appendChild(this.modalBodyContent);
    this.gameOptionsModal.show();

    this.modalSaveButton = this.modalElement.querySelector('.confirm-button');
    this.modalCancelButton = this.modalElement.querySelector('.cancel-button');
    this.modalCloseButton = this.modalElement.querySelector('.btn-close');

    this.modalSaveButton.addEventListener('click', this.saveSelectedOptions);
    this.modalCancelButton.addEventListener('click', this.closeGameOptionsModal);
    this.modalCloseButton.addEventListener('click', this.closeGameOptionsModal);
  }

  saveSelectedOptions() {
    this.#state.options = this.modalBodyContent.selectedOptions;
    this.closeGameOptionsModal();
    devLog('Game options:', this.#state.options);
  }

  closeGameOptionsModal() {
    if (this.gameOptionsModal) {
      this.modalSaveButton.removeEventListener('click', this.saveSelectedOptions);
      this.modalCancelButton.removeEventListener('click', this.closeGameOptionsModal);
      this.modalCloseButton.removeEventListener('click', this.closeGameOptionsModal);
      this.gameOptionsModal.hide();
      document.body.removeChild(this.modalElement);
      this.gameOptionsModal = null;
    }
  }

  async handleSearchInput(event) {
    event.preventDefault();
    event.stopPropagation();
    clearTimeout(this.#usersearch.searchTimeout);
    this.#usersearch.searchTimeout = setTimeout( async () => {
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
    if (response.success && response.data) {
      if (response.data.count === 0) {
        this.renderNoUserFound();
        return;
      }
      this.#usersearch.list.push(...response.data.items);
      this.#usersearch.totalUsersCount = response.data.count;
      this.renderUserList();
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
    this.inviteButton.classList.remove('disabled');
  }

  async inviteToDuel(event) {
    event.preventDefault();
    if (!this.#state.opponentUsername) {
      const errorMessage = 'Opponent not selected';
      showAlertMessageForDuration(ALERT_TYPE.ERROR, errorMessage, 5000);
      return;
    }
    const queryParams = {
      status: 'inviting',
      username: this.#state.opponentUsername,
      nickname: this.opponentNickname.textContent,
      avatar: this.opponentAvatar.src,
      elo: this.opponentElo.textContent,
    };
    router.navigate('/duel', queryParams);
  }

  async requestMatchMaking(event) {
    event.preventDefault();
    router.navigate('/duel', { status: 'matchmaking' });
  }

  hideUserList(event) {
    event.stopPropagation();
    if (this.userList.contains(event.target) || this.searchInput.contains(event.target)) {
      return;
    }
    this.userList.classList.remove('show');
    this.userList.innerHTML = '';
    this.#usersearch.list = [];
    this.#usersearch.totalUsersCount = 0;
    this.#usersearch.currentListLength = 0;
    this.#usersearch.searchQuery = '';
    this.searchInput.value = '';
  }

  /* ------------------------------------------------------------------------ */
  /*      Templates & styles                                                  */
  /* ------------------------------------------------------------------------ */
  template() {
    return `
      <div class="container">
        <div class="row justify-content-center py-4">
          <div class="form-container col-12 col-sm-10 col-md-8 col-lg-6 col-xl-5 p-4">
            <div class="d-flex flex-column justify-content-center align-items-center w-100">
              <h2 class="text-start m-0 pt-2 w-75">Duel</h2>
              <button class="btn d-flex flex-row justify-content-end align-items-center fw-bold w-75 m-0 p-0 mb-3" id="game-options-button">
                Game options&nbsp;
                <i class="bi bi-arrow-right"></i>
              </button>
              <form class="w-75">
                <p class="fs-5 fw-bolder m-0 mb-3">Choose your opponent</p>
                <div class="input-group position-relative">
                  <span class="input-group-text" id="basic-addon1"><i class="bi bi-search"></i></span>
                  <input class="form-control" type="search" placeholder="Find user" aria-label="Search" id="search-opponent" autocomplete="off">
                  <ul class="dropdown-menu position-absolute px-3 w-100" id="duel-user-list"></ul>
                </div>

                <div class="d-flex flex-column align-items-center w-100 mb-2 p-3">
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

                <button type="submit" id="invite-button" class="btn btn-wood btn-lg w-100 disabled">Send a challenge</button>

                <div class="d-flex align-items-center w-100 w-100 my-2 py-3">
                  <hr class="flex-grow-1">
                  <span class="mx-2">OR</span>
                  <hr class="flex-grow-1">
                </div>

                <p class="fs-5 fw-bolder m-0 mb-3">Let fate decide opponent</p>
                <button type="submit" id="request-matchmaking-button" class="btn btn-wood btn-lg mb-1 w-100">Bring me my rival</button>
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
    #game-options-button {
      color: rgba(var(--bs-body-color-rgb), 0.6);
    }
    #duel-user-list {
      min-width: 280px;
      max-height: 320px;
      top: 100%;
    }
    .duel-usersearch-status-indicator {
      bottom: 0;
      right: 0;
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
          <img class="duel-usersearch-avatar avatar-s rounded-circle mt-1" />
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

  gameOptionsModalTemplate() {
    return `
    <div class="modal fade mt-5" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog pt-4">
        <div class="modal-content btn-wood">
          <div class="modal-header border-0">
            <button type="button" class="btn-close"></button>
          </div>
          <div class="modal-body"></div>
          <div class="modal-footer border-0 mt-4">
            <button type="button" class="cancel-button btn" data-bs-dismiss="modal">Cancel</button>
            <button type="button" class="confirm-button btn fw-bolder fs-5" data-bs-dismiss="modal">Save choice</button>
          </div>
        </div>
      <div>
    </div>
    `;
  }
}

customElements.define('duel-menu', DuelMenu);
