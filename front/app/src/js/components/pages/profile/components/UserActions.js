import {router} from '@router';

export class ProfileUserActions extends HTMLElement {
  constructor() {
    super();
    this._data = {
      username: null,
      friends: [],
      blockedUsers: [],
    };
    this._isMe = false;
    this._isFriend = false;
  }

  set data(value) {
    this._data = value;
    this.render();
  }

  connectedCallback() {
    this.render();
  }

  render() {
    this.setProfileType();
    this.innerHTML = `
			<style>
				.profile-user-action-button {
					display: none;
				}
			</style>
			<div class="d-flex flex-row justify-content-center my-2">
				<button class="btn btn-primary mx-1 profile-user-action-button" id="edit-profile-button">Edit Profile</button>

				<button class="btn btn-primary mx-1 profile-user-action-button" id="add-friend-button">${this._isFriend ? 'Friend' : 'Add friend'}</button>

				<button class="btn btn-primary mx-1 profile-user-action-button" id="send-message-button">Send Message</button>

				<button class="btn btn-primary mx-1 profile-user-action-button" id="block-user-button">Block user</button>
			</div>
		`;
    this.setupButtons();
  }

  setProfileType(isMe) {
    // Temporary solution -------------------------------------
    const storedUser = localStorage.getItem('user');
    const myInfo = storedUser ? JSON.parse(storedUser) : null;
    const myUsername = myInfo ? myInfo.username : null;

    console.log('User:', this._data);
    console.log('My username:', myUsername);
    // --------------------------------------------------------

    const username = this._data.username;
    const friends = this._data.friends;

    // Test friend --------------------------------------------
    // friends.push('Alice');
    // --------------------------------------------------------

    this._isMe = myUsername === username;
    if (!this._isMe) {
      this._isFriend = friends.includes(myUsername);
    }
  }

  setupButtons() {
    if (this._isMe) {
      const editProfileButton = this.querySelector('#edit-profile-button');
      editProfileButton.style.display = 'block';
      editProfileButton.addEventListener('click', () => {
        router.navigate(`/settings/${this._data.username}`);
      });
      return;
    }

    const sendMessageButton = this.querySelector('#send-message-button');
    sendMessageButton.style.display = 'block';
    // Handle send message

    const addFriendButton = this.querySelector('#add-friend-button');
    addFriendButton.style.display = 'block';
    if (this._isFriend) {
      addFriendButton.disabled = true;
    } else {
      // Handle add friend
    }

    const blockUserButton = this.querySelector('#block-user-button');
    blockUserButton.style.display = 'block';
    // Handle block user
  }
}

customElements.define('profile-user-actions', ProfileUserActions);
