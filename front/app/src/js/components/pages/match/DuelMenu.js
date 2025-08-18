/**
 * @module DuelMenu
 * @description Component for the Duel Menu page, allowing users to invite others to a duel or request matchmaking.
 */

import { Modal } from 'bootstrap';
import { router } from '@router';
import { apiRequest, API_ENDPOINTS } from '@api';
import { auth } from '@auth';
import { socketManager } from '@socket';
import { setupObserver } from '@utils';
import { getOptionsFromLocalStorage } from './utils/gameOptions.js';
import { DEFAULT_GAME_OPTIONS } from '@env';
import {
  showAlertMessageForDuration,
  ALERT_TYPE,
  showToastNotification,
  TOAST_TYPES,
  sessionExpiredToast,
} from '@utils';
import anonymousAvatar from '/img/anonymous-avatar.png?url';

export class DuelMenu extends HTMLElement {
  /**
   * Private state of the DuelMenu component.
   * @property {Object} user - The authenticated user.
   * @property {string} opponentUsername - The username of the selected opponent.
   */
  #state = {
    user: null,
    opponentUsername: '',
  };

  /**
   * Object to manage user search functionality.
   * @property {string} searchQuery - The current search query.
   * @property {Array} list - The list of users matching the search query.
   * @property {number} totalUsersCount - Total number of users matching the search query.
   * @property {number} currentListLength - Current length of the user list.
   * @property {number} searchTimeout - Timeout ID for the search input delay.
   * @property {boolean} isLoading - Flag indicating if the user list is currently loading.
   */
  #usersearch = {
    searchQuery: '',
    list: [],
    totalUsersCount: 0,
    currentListLength: 0,
    searchTimeout: null,
    isLoading: false,
  };

  /**
   * @property {IntersectionObserver} observer - The IntersectionObserver instance for lazy loading friends.
   * @property {HTMLElement} loadMoreAnchor - The anchor element for loading more friends.
   */
  observer = null;
  loadMoreAnchor = null;

  OPTIONS_UNAVAILABLE_MESSAGE = 'Game options are momentarily unavailable. Set to default settings.';

  constructor() {
    super();

    // Initialize references to DOM elements
    this.optionsButton = null;
    this.modalElement = null;
    this.gameOptionsModal = null;
    this.form = null;
    this.searchInput = null;
    this.userList = null;
    this.inviteButton = null;
    this.requestMatchmakingButton = null;
    this.opponentNickname = null;
    this.opponentUsername = null;
    this.opponentElo = null;
    this.opponentAvatar = null;
    this.opponentOnlineStatus = null;

    // Bind event handlers
    this.openGameOptionsModal = this.openGameOptionsModal.bind(this);
    this.closeGameOptionsModalWithoutSaving = this.closeGameOptionsModalWithoutSaving.bind(this);
    this.clearFocusInModal = this.clearFocusInModal.bind(this);
    this.saveSelectedOptions = this.saveSelectedOptions.bind(this);
    this.handleSearchInput = this.handleSearchInput.bind(this);
    this.loadMoreUsers = this.loadMoreUsers.bind(this);
    this.hideUserList = this.hideUserList.bind(this);
    this.selectOpponent = this.selectOpponent.bind(this);
    this.inviteToDuel = this.inviteToDuel.bind(this);
    this.handleMatchmakingRequest = this.handleMatchmakingRequest.bind(this);
    this.ignoreEnterKeyPress = this.ignoreEnterKeyPress.bind(this);
  }

  /**
   * @description Lifecycle method called when the component is connected to the DOM.
   * It checks the authentication status of the user and redirects accordingly.
   * If the user is authenticated and has an ongoing game, it redirects to the game page.
   */
  async connectedCallback() {
    const loading = document.createElement('loading-animation');
    this.innerHTML = loading.outerHTML;
    const authStatus = await auth.fetchAuthStatus();
    if (!authStatus.success) {
      if (authStatus.status === 429) {
        return;
      }
      if (authStatus.status === 401) {
        sessionExpiredToast();
      }
      router.redirect('/login');
      return;
    }
    this.#state.user = authStatus.response;
    if (authStatus.response.game_id) {
      log.info('Ongoing duel found. Redirect to game page', authStatus.response.game_id);
      router.redirect(`multiplayer-game/${authStatus.response.game_id}`);
      return;
    }
    this.render();
  }

  disconnectedCallback() {
    this.cleanObserver();
    this.modalBodyContent?.remove();
    this.modalBodyContent = null;
    this.modalElement.addEventListener(
      'hidden.bs.modal',
      () => {
        this.modalElement?.removeEventListener('hide.bs.modal', this.clearFocusInModal);
        document.body.removeChild(this.modalElement);
        this.gameOptionsModal.dispose();
        this.gameOptionsModal = null;
      },
      { once: true },
    );
    this.optionsButton?.removeEventListener('click', this.openGameOptionsModal);
    this.searchInput?.removeEventListener('input', this.handleSearchInput);
    this.searchInput?.removeEventListener('keydown', this.ignoreEnterKeyPress);
    document.removeEventListener('click', this.hideUserList);
    this.inviteButton?.removeEventListener('click', this.inviteToDuel);
    this.requestMatchmakingButton?.removeEventListener('click', this.handleMatchmakingRequest);
    this.userList?.querySelectorAll('li').forEach((item) => {
      item.removeEventListener('click', this.selectOpponent);
    });
    this.modalSaveButton?.removeEventListener('click', this.saveSelectedOptions);
    this.modalCancelButton?.removeEventListener('click', this.closeGameOptionsModalWithoutSaving);
    this.modalCloseButton?.removeEventListener('click', this.closeGameOptionsModalWithoutSaving);
    if (!this.gameOptionsModal) {
      return;
    }
    this.gameOptionsModal.hide();
  }

  /* ------------------------------------------------------------------------ */
  /*      Rendering                                                           */
  /* ------------------------------------------------------------------------ */
  render() {
    this.innerHTML = '';
    this.innerHTML = this.style() + this.template();

    // Set references to DOM elements
    this.optionsButton = this.querySelector('#game-options-button');
    this.searchInput = this.querySelector('input');
    this.userList = this.querySelector('#duel-user-list');
    this.inviteButton = this.querySelector('#invite-button');
    this.requestMatchmakingButton = this.querySelector('#request-matchmaking-button');
    this.opponentNickname = this.querySelector('.opponent-nickname');
    this.opponentUsername = this.querySelector('.opponent-username');
    this.opponentElo = this.querySelector('.opponent-elo');
    this.opponentAvatarWraper = this.querySelector('.opponent-avatar-wrapper');
    this.opponentAvatar = this.querySelector('.opponent-avatar');
    this.opponentOnlineStatus = this.querySelector('.opponent-status-indicator');

    this.opponentAvatar.src = anonymousAvatar;
    this.renderGameOptionsModal();

    // Add event listeners
    this.optionsButton.addEventListener('click', this.openGameOptionsModal);
    this.searchInput.addEventListener('input', this.handleSearchInput);
    this.searchInput.addEventListener('keydown', this.ignoreEnterKeyPress);
    document.addEventListener('click', this.hideUserList);
    this.inviteButton.addEventListener('click', this.inviteToDuel);
    this.requestMatchmakingButton.addEventListener('click', this.handleMatchmakingRequest);
  }

  /**
   * @description Renders the game options modal.
   * It creates a modal element, appends it to the body, and initializes the Modal
   * @returns {void}
   */
  renderGameOptionsModal() {
    const template = document.createElement('template');
    template.innerHTML = this.gameOptionsModalTemplate();
    this.modalElement = template.content.querySelector('.modal');
    document.body.appendChild(this.modalElement);
    this.gameOptionsModal = new Modal(this.modalElement);
    if (!this.gameOptionsModal) {
      showToastNotification(this.OPTIONS_UNAVAILABLE_MESSAGE, TOAST_TYPES.ERROR);
      return;
    }
    this.modalBodyContent = document.querySelector('game-options');
  }

  /* ------------------------------------------------------------------------ */
  /*      Event handling - Game options                                       */
  /* ------------------------------------------------------------------------ */

  /**
   * @description Opens the game options modal, allowing users to select game settings.
   * It creates a modal element, appends it to the body, and initializes the Modal instance.
   * It also sets up event listeners for saving and canceling the options.
   */
  openGameOptionsModal() {
    this.gameOptionsModal.show();

    this.modalSaveButton = this.modalElement.querySelector('.confirm-button');
    this.modalCancelButton = this.modalElement.querySelector('.cancel-button');
    this.modalCloseButton = this.modalElement.querySelector('.btn-close');

    this.modalSaveButton.addEventListener('click', this.saveSelectedOptions);
    this.modalCancelButton.addEventListener('click', this.closeGameOptionsModalWithoutSaving);
    this.modalCloseButton.addEventListener('click', this.closeGameOptionsModalWithoutSaving);
    this.modalElement.addEventListener('hide.bs.modal', this.clearFocusInModal);
  }

  saveSelectedOptions() {
    this.modalBodyContent.storeOptionsToLocalStorage();
    if (!this.gameOptionsModal) {
      return;
    }
    this.gameOptionsModal.hide();
  }

  closeGameOptionsModalWithoutSaving() {
    if (!this.gameOptionsModal) {
      return;
    }
    this.modalBodyContent.selectedOptions = getOptionsFromLocalStorage();
    this.gameOptionsModal.hide();
  }

  /**
   * @description Clears the focus from any active element within the modal.
   * This is useful to prevent focus issues when the modal is closed or when the user interacts with it.
   */
  clearFocusInModal() {
    if (this.modalElement.contains(document.activeElement)) {
      document.activeElement.blur();
    }
  }

  /* ------------------------------------------------------------------------ */
  /*      Event handling - Game invitations                                   */
  /* ------------------------------------------------------------------------ */

  /**
   * @description Handles the search input for finding users to invite to a duel.
   */
  async handleSearchInput(event) {
    event.preventDefault();
    event.stopPropagation();
    clearTimeout(this.#usersearch.searchTimeout);
    this.#usersearch.searchTimeout = setTimeout(async () => {
      this.#usersearch.list = [];
      this.#usersearch.totalUsersCount = 0;
      this.#usersearch.currentListLength = 0;
      this.userList.scrollTop = 0;
      this.cleanObserver();
      this.userList.innerHTML = '';
      this.userList.classList.remove('show');
      if (this.#usersearch.searchQuery !== event.target.value && event.target.value.length > 0) {
        this.#usersearch.searchQuery = event.target.value;
        await this.searchUser();
        this.renderUserList();
        [this.observer, this.loadMoreAnchor] = setupObserver(this.userList, this.loadMoreUsers);
      } else {
        this.#usersearch.searchQuery = '';
      }
    }, 500);
  }

  /**
   * @description Sends a request to the API to search for users based on the current search query.
   */
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

  /**
   * @description Renders the user list based on the search results.
   */
  renderUserList() {
    for (let i = this.#usersearch.currentListLength; i < this.#usersearch.list.length; i++) {
      if (this.#usersearch.list[i].username !== this.#state.user.username) {
        this.renderUserListItem(this.#usersearch.list[i]);
      }
    }
    this.#usersearch.currentListLength = this.#usersearch.list.length;
    this.userList.classList.add('show');
  }

  /**
   * @description Renders a single user list item in the user search dropdown.
   */
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

  /**
   * @description Loads more users when the user scrolls to the bottom of the user list.
   */
  async loadMoreUsers(entries) {
    const entry = entries[0];
    if (
      !entry.isIntersecting ||
      this.#usersearch.totalUsersCount === this.#usersearch.currentListLength ||
      this.#usersearch.isLoading
    ) {
      return;
    }
    this.#usersearch.isLoading = true;
    await this.searchUser();
    this.renderUserList();
    this.observer.unobserve(this.loadMoreAnchor);
    this.userList.appendChild(this.loadMoreAnchor);
    this.observer.observe(this.loadMoreAnchor);
    this.#usersearch.isLoading = false;
  }

  /**
   * @description Renders a message indicating that no user was found based on the search query.
   * This is displayed when the search results are empty.
   */
  renderNoUserFound() {
    const noUser = document.createElement('li');
    noUser.textContent = 'No user found';
    this.userList.appendChild(noUser);
    this.userList.classList.add('show');
  }

  /**
   * @description Hides the user list dropdown when clicking outside of it or the search input.
   */
  hideUserList(event) {
    event.stopPropagation();
    if (this.userList.contains(event.target) || this.searchInput.contains(event.target)) {
      return;
    }
    this.cleanObserver();
    this.userList.classList.remove('show');
    this.userList.scrollTop = 0;
    this.userList.innerHTML = '';
    this.#usersearch.list = [];
    this.#usersearch.totalUsersCount = 0;
    this.#usersearch.currentListLength = 0;
    this.#usersearch.searchQuery = '';
    this.searchInput.value = '';
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

  ignoreEnterKeyPress(event) {
    if (event.key === 'Enter') {
      event.preventDefault();
    }
  }

  /**
   * @description On click on a user in the search results, this function selects the opponent.
   */
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
    this.opponentAvatarWraper.classList.remove('d-none');

    const onlineStatusIndicator = selectedUser.querySelector('.duel-usersearch-status-indicator');
    const online = onlineStatusIndicator.classList.contains('online');
    online ? this.opponentOnlineStatus.classList.add('online') : this.opponentOnlineStatus.classList.remove('online');
    this.opponentOnlineStatus.classList.remove('d-none');

    this.userList.innerHTML = '';
    this.userList.classList.remove('show');
    this.#usersearch.list = [];
    this.#usersearch.currentListLength = 0;
    this.#usersearch.searchQuery = '';
    this.searchInput.value = '';

    this.#state.opponentUsername = username.substring(1);
    this.inviteButton.classList.remove('disabled');
  }

  /**
   * @description Invites the selected opponent to a duel.
   * It checks if an opponent is selected, verifies if the user can engage in a game,
   * and sends a game invitation message through the socket manager with the selected options.
   */
  async inviteToDuel(event) {
    event.preventDefault();
    if (!this.#state.opponentUsername) {
      const errorMessage = 'Opponent not selected';
      showAlertMessageForDuration(ALERT_TYPE.ERROR, errorMessage, 5000);
      return;
    }
    const canEngage = await auth.canEngageInGame();
    if (!canEngage) {
      return;
    }
    const clientInstanceId = socketManager.getClientInstanceId('livechat');
    const message = {
      action: 'game_invite',
      data: {
        username: this.#state.opponentUsername,
        client_id: clientInstanceId,
      },
    };
    if (this.modalBodyContent) {
      message.data.settings = this.modalBodyContent.selectedOptionsAsObject;
    } else {
      showToastNotification(this.OPTIONS_UNAVAILABLE_MESSAGE, TOAST_TYPES.ERROR);
      message.data.settings = DEFAULT_GAME_OPTIONS;
    }
    socketManager.sendMessage('livechat', message);
    const queryParams = {
      status: 'inviting',
      username: this.#state.opponentUsername,
      nickname: this.opponentNickname.textContent,
      avatar: this.opponentAvatar.src,
      ...message.data.settings,
    };
    router.navigate('/duel', queryParams);
  }

  /* ------------------------------------------------------------------------ */
  /*      Event handling - Matchmaking                                        */
  /* ------------------------------------------------------------------------ */

  /**
   * @description Navigates to the Duel page to initiate matchmaking.
   * Verifies if the user is eligible to join a game, builds query parameters from the selected options,
   * and navigates to the Duel page with matchmaking status and user-selected game options.
   */
  async handleMatchmakingRequest(event) {
    event.preventDefault();
    const canEngage = await auth.canEngageInGame();
    if (!canEngage) {
      return;
    }
    let queryParams = null;
    if (this.modalBodyContent) {
      queryParams = this.modalBodyContent.selectedOptionsAsQueryParams;
    } else {
      showToastNotification(this.OPTIONS_UNAVAILABLE_MESSAGE, TOAST_TYPES.ERROR);
    }
    queryParams
      ? router.navigate('/duel', { status: 'matchmaking', params: queryParams })
      : router.navigate('/duel', { status: 'matchmaking' });
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
                  <ul class="dropdown-menu position-absolute px-3 w-100 overflow-auto" id="duel-user-list"></ul>
                </div>

                <div class="d-flex flex-column align-items-center w-100 mb-2 p-3">
                  <div class="d-flex flex-row align-items-center gap-3">
                    <p class="opponent-nickname m-0 fs-4 fw-bolder text-break"></p>
                    <p class="opponent-username m-0 text-break"></p>
                  </div>
                  <span class="opponent-elo badge ms-2 my-1"></span>
                  <div class="opponent-avatar-wrapper position-relative d-inline-block mt-2 d-none">
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
                <button type="submit" id="request-matchmaking-button" class="btn btn-wood btn-lg mb-5 w-100">Bring me my rival</button>

                <game-instruction></game-instruction>

                <div class="d-flex flex-row justify-content-center mt-5">
                  <a href="/home" class="btn">
                    <i class="bi bi-arrow-left"></i>
                    Back to Saloon
                  </a>
                </div>
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
      color: rgba(var(--bs-body-color-rgb), 0.8);
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
      background-color: var(--pm-primary-600);
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
    <div class="modal fade mt-2" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog pt-4">
        <div class="modal-content game-options-modal wood-board">
          <div class="modal-header border-0">
            <button type="button" class="btn-close btn-close-white" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <game-options></game-options>
          </div>
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
