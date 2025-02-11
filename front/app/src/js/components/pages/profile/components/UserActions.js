import { router } from '@router';
import { apiRequest, API_ENDPOINTS } from '@api';

export class ProfileUserActions extends HTMLElement {
  constructor() {
    super();
    this._data = {
      'loggedInUsername': '',
      'shownUsername': '',
      'isFriend': false,
      'isBlockedByUser': false,
    };
    this.isMyProfile = false;
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
        router.navigate(`/settings/${this._data.loggedInUsername}`);
      });
      return;
    }

    if (!this._data.isBlockedByUser) {
      // Send message
      const sendMessageButton = this.querySelector('#send-message-button');
      sendMessageButton.style.display = 'block';
      // Handle send message

      // Add or Remove friend
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

  async addFriend() {
    const request = { 'username': this._data.shownUsername };
    const response = await apiRequest(
        'POST',
        /* eslint-disable-next-line new-cap */
        API_ENDPOINTS.USER_FRIENDS(this._data.loggedInUsername),
        request,
        false,
        true,
    );
    if (response.success) {
      this._data.isFriend = true;
      this.render();
    }
    // Handle error
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
    if (response.success) {
      this._data.isFriend = false;
      this.render();
    }
    // Handle error
  }

  async blockUser() {
    const request = { 'username': this._data.shownUsername };
    const response = await apiRequest(
        'POST',
        /* eslint-disable-next-line new-cap */
        API_ENDPOINTS.USER_BLOCKED_USERS(this._data.loggedInUsername),
        request,
        false,
        true,
    );
    if (response.success) {
      this._data.isBlockedByUser = true;
      this.render();
    }
    // Handle error
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
    if (response.success) {
      this._data.isBlockedByUser = false;
      this.render();
    }
  // Handle error
  }
}

customElements.define('profile-user-actions', ProfileUserActions);
