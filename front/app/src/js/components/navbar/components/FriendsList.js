import { router } from '@router';
import { auth } from '@auth';
import { apiRequest, API_ENDPOINTS } from '@api';
import { showAlertMessageForDuration, ALERT_TYPE, ERROR_MESSAGES } from '@utils';

export class FriendsList extends HTMLElement {
  #state = {
    username: '',
    friendsList: [],
    totalFriendsCount: 0,
    listLength: 0,
  };

  constructor() {
    super();
    this.fetchFriendsData = this.fetchFriendsData.bind(this);
    this.handleModalClose = this.handleModalClose.bind(this);
    this.handleShowMoreFriends = this.handleShowMoreFriends.bind(this);
  }

  connectedCallback() {
    this.render();
  }

  disconnectedCallback() {
    this.button?.removeEventListener('shown.bs.dropdown', this.fetchFriendsData);
    this.button?.removeEventListener('hidden.bs.dropdown', this.handleModalClose);
    this.showMoreButton?.removeEventListener('click', this.handleShowMoreFriends);
  }

  render() {
    this.innerHTML = this.template();

    this.button = document.getElementById('navbar-friends-button');
    this.listContainer = this.querySelector('#friends-list');

    this.button?.addEventListener('shown.bs.dropdown', this.fetchFriendsData);
    this.button?.addEventListener('hidden.bs.dropdown', this.handleModalClose);
  }

  async fetchFriendsData() {
    this.#state.username = auth.getStoredUser().username;
    this.#state.listLength = this.#state.friendsList.length;
    const response = await apiRequest(
        'GET',
        /* eslint-disable-next-line new-cap */
        API_ENDPOINTS.USER_FRIENDS_LIST(this.#state.username, 10, this.#state.listLength),
        null,
        false,
        true,
    );
    if (response.success) {
      if (response.data) {
        this.#state.totalFriendsCount = response.data.count;
        this.#state.friendsList.push(...response.data.items);
      }
      this.renderFriendsList();
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

  renderFriendsList() {
    if (this.#state.friendsList.length === 0) {
      this.renderNoFriendsFound();
      return;
    }
    for (let i = this.#state.listLength; i < this.#state.friendsList.length; i++) {
      const listItem = document.createElement('user-list-item');
      listItem.data = this.#state.friendsList[i];
      if (i === 0) {
        const firstItem = listItem.querySelector('.list-group-item');
        firstItem.classList.add('border-top-0');
      }
      this.listContainer.appendChild(listItem);
      this.#state.listLength++;
    }
    if (this.#state.totalFriendsCount > this.#state.listLength) {
      this.renderShowMoreButton();
    }
  }

  renderNoFriendsFound() {
    const noFriends = document.createElement('li');
    noFriends.innerHTML = this.noFriendTemplate();
    this.listContainer.appendChild(noFriends);
  }

  renderShowMoreButton() {
    const showMoreButtonContainer = document.createElement('li');
    showMoreButtonContainer.innerHTML = this.showMoreButtonTemplate();
    this.listContainer.appendChild(showMoreButtonContainer);

    this.showMoreButton = showMoreButtonContainer.querySelector('#show-more-friends');
    this.showMoreButton?.addEventListener('click', this.handleShowMoreFriends);
  }

  handleModalClose() {
    this.#state.friendsList = [];
    this.#state.totalFriendsCount = 0;
    this.listContainer.innerHTML = '';
  }

  async handleShowMoreFriends(event) {
    event.stopPropagation();
    await this.fetchFriendsData();
    this.showMoreButton?.removeEventListener('click', this.handleShowMoreFriends);
    this.showMoreButton?.remove();
  }

  template() {
    return `
    <div class="ps-3 pe-4">
      <h6 class="py-4 dropdown-list-header" sticky>Friends</h6>
      <ul class="dropdown-list list-group mb-2" id="friends-list"></ul>
    </div>
    `;
  }

  noFriendTemplate() {
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
      <p class="text-center m-0">No friends found</p>
    </div>
    `;
  }

  showMoreButtonTemplate() {
    return `
    <style>
    #show-more-friends {
      border: none;
      position: relative;
      border-top: 1px solid var(--bs-border-color);
    }
    li {
      list-style-type: none;
    }
    </style>
    <div class="list-group-item mt-4 p-3" id="show-more-friends">
      <p class="text-center m-0">Show more friends</p>
    </div>
    `;
  }
}

customElements.define('friends-list', FriendsList);
