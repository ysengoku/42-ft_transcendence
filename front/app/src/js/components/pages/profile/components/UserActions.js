import { router } from '@router';
import { apiRequest, API_ENDPOINTS } from '@api';
import { showAlertMessageForDuration, ALERT_TYPE } from '@utils';

export class ProfileUserActions extends HTMLElement {
  constructor() {
    super();
    this._data = {
      loggedInUsername: '',
      shownUsername: '',
      isFriend: false,
      isBlockedByUser: false,
    };
    this.isMyProfile = false;
    this.errorMessages = {
      addFriend: 'Failed to add friend. Please try again later.',
      removeFriend: 'Failed to remove friend. Please try again later.',
      blockUser: 'Failed to block user. Please try again later.',
      unblockUser: 'Failed to unblock user. Please try again later.',
    };
  }

  set data(value) {
    this._data = value;
    // ----- For rendering test ------------
    // this._data.isFriend = true;
    // this._data.isBlockedByUser = true;
    // -------------------------------------
    this.isMyProfile = this._data.loggedInUsername === this._data.shownUsername;
    this.render();
  }

  render() {
    this.innerHTML = `
			<style>
				.profile-user-action-button {
					display: none;
				}
			</style>
			<div class="d-flex flex-row justify-content-center my-2">
				<button class="btn btn-primary mx-1 profile-user-action-button" id="edit-profile-button">Edit Profile</button>

				<button class="btn btn-primary mx-1 profile-user-action-button" id="add-friend-button">${this._data.isFriend ? 'Remove friend' : 'Add friend'}</button>

				<button class="btn btn-primary mx-1 profile-user-action-button" id="send-message-button">Send Message</button>

				<button class="btn btn-primary mx-1 profile-user-action-button" id="block-user-button">${this._data.isBlockedByUser ? 'Unblock user' : 'Block user'}</button>
			</div>
		`;
    this.setupButtons();
  }

  setupButtons() {
    if (this.isMyProfile) {
      const editProfileButton = this.querySelector('#edit-profile-button');
      editProfileButton.style.display = 'block';
      editProfileButton.addEventListener('click', () => {
        router.navigate(`/settings`);
      });
      return;
    }

    if (!this._data.isBlockedByUser) {
      const sendMessageButton = this.querySelector('#send-message-button');
      sendMessageButton.style.display = 'block';
      // Handle send message

      const addFriendButton = this.querySelector('#add-friend-button');
      addFriendButton.style.display = 'block';
      if (this._data.isFriend) {
        addFriendButton.addEventListener('click', this.removeFriend.bind(this));
      } else {
        addFriendButton.addEventListener('click', this.addFriend.bind(this));
      }
    }

    const blockUserButton = this.querySelector('#block-user-button');
    blockUserButton.style.display = 'block';
    if (this._data.isBlockedByUser) {
      blockUserButton.addEventListener('click', this.unblockUser.bind(this));
    } else {
      blockUserButton.addEventListener('click', this.blockUser.bind(this));
    }
  }

  // --- For rendering test --------------
  async testResponse() {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ success: false });
      }, 500);
    });
  }
  // -------------------------------------

  async addFriend() {
    const request = { username: this._data.shownUsername };
    const response = await apiRequest(
        'POST',
        /* eslint-disable-next-line new-cap */
        API_ENDPOINTS.USER_FRIENDS(this._data.loggedInUsername),
        request,
        false,
        true,
    );
    // --- For rendering test ---------------------
    // const response = await this.testResponse();
    // --------------------------------------------
    if (response.success) {
      this._data.isFriend = true;
      this.render();
    } else {
      console.error('Error adding friend:', response);
      showAlertMessageForDuration(ALERT_TYPE.ERROR, this.errorMessages.addFriend, 3000);
    }
  }

  async removeFriend() {
    const response = await apiRequest(
        'DELETE',
        /* eslint-disable-next-line new-cap */
        API_ENDPOINTS.USER_REMOVE_FRIEND(this._data.loggedInUsername, this._data.shownUsername),
        null,
        false,
        true,
    );
    // --- For rendering test ---------------------
    // const response = await this.testResponse();
    // --------------------------------------------
    if (response.success) {
      this._data.isFriend = false;
      this.render();
    } else {
      console.error('Error removing friend:', response);
      showAlertMessageForDuration(ALERT_TYPE.ERROR, this.errorMessages.removeFriend, 3000);
    }
  }

  async blockUser() {
    const request = { username: this._data.shownUsername };
    const response = await apiRequest(
        'POST',
        /* eslint-disable-next-line new-cap */
        API_ENDPOINTS.USER_BLOCKED_USERS(this._data.loggedInUsername),
        request,
        false,
        true,
    );
    // --- For rendering test ---------------------
    // const response = await this.testResponse();
    // --------------------------------------------
    if (response.success) {
      this._data.isBlockedByUser = true;
      this._data.isFriend = false;
      this.render();
    } else {
      console.error('Error blocking user:', response);
      showAlertMessageForDuration(ALERT_TYPE.ERROR, this.errorMessages.blockUser, 3000);
    }
  }

  async unblockUser() {
    const response = await apiRequest(
        'DELETE',
        /* eslint-disable-next-line new-cap */
        API_ENDPOINTS.USER_UNBLOCK_USER(this._data.loggedInUsername, this._data.shownUsername),
        null,
        false,
        true,
    );
    // --- For rendering test ---------------------
    // const response = await this.testResponse();
    // --------------------------------------------
    if (response.success) {
      this._data.isBlockedByUser = false;
      this.render();
    } else {
      console.error('Error unblocking:', response);
      showAlertMessageForDuration(ALERT_TYPE.ERROR, this.errorMessages.unblockUser, 3000);
    }
  }
}

customElements.define('profile-user-actions', ProfileUserActions);
