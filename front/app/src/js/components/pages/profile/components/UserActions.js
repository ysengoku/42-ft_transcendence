import { router } from '@router';

export class ProfileUserActions extends HTMLElement {
  constructor() {
    super();
    this._data = {
      'isMyProfile': false,
      'username': '',
      'isFriend': false,
      'isBlockedByUser': false,
    };
  }

  set data(value) {
    this._data = value;
    // ----- For rendering test ------------
    // this._data.isFriend = true;
    // this._data.isBlockedByUser = true;
    // -------------------------------------
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
    if (this._data.isMyProfile) {
      const editProfileButton = this.querySelector('#edit-profile-button');
      editProfileButton.style.display = 'block';
      editProfileButton.addEventListener('click', () => {
        router.navigate(`/settings/${this._data.username}`);
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
      // Handle remove friend
      } else {
      // Handle add friend
      }
    }

    const blockUserButton = this.querySelector('#block-user-button');
    blockUserButton.style.display = 'block';
    if (this._data.isBlockedByUser) {
    // Handle unblock user
    } else {
    // Handle block user
    }
  }
}

customElements.define('profile-user-actions', ProfileUserActions);
