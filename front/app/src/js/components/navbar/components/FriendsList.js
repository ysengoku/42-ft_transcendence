import { router } from '@router';
import { auth } from '@auth';
import { apiRequest, API_ENDPOINTS } from '@api';
import { showAlertMessageForDuration, ALERT_TYPE, ALERT_MESSAGES } from '@utils';

export class FriendsList extends HTMLElement {
  constructor() {
    super();
    this.username = '';
    this.friendsList = [];
    this.totalFriendsCount = 0;
  }

  connectedCallback() {
    this.render();
    this.setEventListeners();
  }

  setEventListeners() {
    const button = document.getElementById('navbar-friends-button');
    if (button) {
      button.addEventListener('shown.bs.dropdown', async () => {
        this.fetchFriendsData();
      });
      button.addEventListener('hidden.bs.dropdown', () => {
        this.friendsList = [];
        this.totalFriendsCount = 0;
        const listContainer = this.querySelector('#friends-list');
        listContainer.innerHTML = '';
      });
    }

    // document.addEventListener('hidden.bs.dropdown', () => {
    //   this.friendsList = [];
    //   this.totalFriendsCount = 0;
    //   const listContainer = this.querySelector('#friends-list');
    //   listContainer.innerHTML = '';
    // });

    // For mobile
    document.addEventListener('clickOnFriendsList', async () => {
      await this.fetchFriendsData();
    });
  }

  async fetchFriendsData() {
    // this.friendsList = await simulateFetchFriendsList();
    this.username = auth.getStoredUser().username;
    const listLength = this.friendsList.length;
    const response = await apiRequest(
        'GET',
        /* eslint-disable-next-line new-cap */
        API_ENDPOINTS.USER_FRIENDS_LIST(this.username, 10, listLength),
        null,
        false,
        true,
    );
    if (response.success) {
      if (response.data) {
        this.totalFriendsCount = response.data.count;
        this.friendsList.push(...response.data.items);
      }
      this.renderFriendsList();
    } else {
      if (response.status === 401) {
        showAlertMessageForDuration(ALERT_TYPE.LIGHT, ALERT_MESSAGES.SESSION_EXPIRED, 5000);
        router.navigate('/login');
      } else {
        showAlertMessageForDuration(ALERT_TYPE.ERROR, ALERT_MESSAGES.UNKNOWN_ERROR, 5000);
        router.navigate('/');
      }
    }
  }

  render() {
    this.innerHTML = `
      <style>
        #friends-list-header {
          border-bottom: 1px solid var(--bs-border-color);
		  position: sticky;
		  top: 0;
		  background-color: var(--bs-body-bg);
		  z-index: 1;
        }
      </style>
      <div class="ps-3 pe-4">
        <h6 class="pt-2 pb-4" id="friends-list-header" sticky>Friends</h6>
        <ul class="list-group mb-2" id="friends-list"></ul>
      </div>
    `;
  }

  renderFriendsList() {
    const listContainer = this.querySelector('#friends-list');
    listContainer.innerHTML = '';
    if (this.friendsList.length === 0) {
      this.renderNoFriendsFound(listContainer);
      return;
    }
    this.friendsList.forEach((friend) => {
      // console.log(`Rendering friend:`, friend);
      const listItem = document.createElement('user-list-item');
      listItem.setAttribute('username', friend.username);
      listItem.setAttribute('nickname', friend.nickname);
      listItem.setAttribute('avatar', friend.avatar);
      listItem.setAttribute('online', friend.is_online);
      listContainer.appendChild(listItem);
    });
    if (this.friendsList.length < this.totalFriendsCount) {
      this.renderShowMoreButton(listContainer);
    }
  }

  renderNoFriendsFound(listContainer) {
    const noFriends = document.createElement('li');
    noFriends.innerHTML = `
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
    listContainer.appendChild(noFriends);
  }

  renderShowMoreButton(listContainer) {
    const showMoreButton = document.createElement('li');
    showMoreButton.innerHTML = `
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
    listContainer.appendChild(showMoreButton);

    const button = showMoreButton.querySelector('#show-more-friends');
    if (button) {
      button.addEventListener('click', (event) => {
        event.stopPropagation();
        this.fetchFriendsData();
      });
    }
  }
}

customElements.define('friends-list', FriendsList);
