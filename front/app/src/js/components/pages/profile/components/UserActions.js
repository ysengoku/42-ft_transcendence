import { router } from '@router';
import { apiRequest, API_ENDPOINTS } from '@api';
import { showAlertMessageForDuration, ALERT_TYPE } from '@utils';

export class ProfileUserActions extends HTMLElement {
  #state = {
    data: {
      loggedInUsername: '',
      shownUsername: '',
      isFriend: false,
      isBlocked: false,
    },
    isMyProfile: false,
    errorMessages: {
      addFriend: 'Failed to add friend. Please try again later.',
      removeFriend: 'Failed to remove friend. Please try again later.',
      blockUser: 'Failed to block user. Please try again later.',
      unblockUser: 'Failed to unblock user. Please try again later.',
    },
  };

  constructor() {
    super();
    this.addFriend = this.addFriend.bind(this);
    this.removeFriend = this.removeFriend.bind(this);
    this.blockUser = this.blockUser.bind(this);
    this.unblockUser = this.unblockUser.bind(this);
  }

  set data(value) {
    this.#state.data = value;
    this.#state.isMyProfile = this.#state.data.loggedInUsername === this.#state.data.shownUsername;
    this.render();
  }

  disconnectedCallback() {
    if (this.#state.isMyProfile) {
      this.editProfileButton.removeEventListener('click', this.handleEditProfile);
      return;
    }
    if (!this.#state.data.isBlocked) {
      if (this.#state.data.isFriend) {
        this.addFriendButton.removeEventListener('click', this.removeFriend);
      } else {
        this.addFriendButton.removeEventListener('click', this.addFriend);
      }
    }
    if (this.#state.data.isBlocked) {
      this.blockUserButton.removeEventListener('click', this.unblockUser);
    } else {
      this.blockUserButton.removeEventListener('click', this.blockUser);
    }
  }

  render() {
    this.innerHTML = this.template() + this.style();

    if (this.#state.isMyProfile) {
      this.editProfileButton = this.querySelector('#edit-profile-button');
      this.editProfileButton.style.display = 'block';
      this.handleEditProfile = () => {
        router.navigate(`/settings`);
      };
      this.editProfileButton.addEventListener('click', this.handleEditProfile);
      return;
    }

    if (!this.#state.data.isBlocked) {
      this.sendMessageButton = this.querySelector('#send-message-button');
      this.sendMessageButton.style.display = 'block';
      // TODO: Handle send message

      this.addFriendButton = this.querySelector('#add-friend-button');
      this.addFriendButton.style.display = 'block';
      if (this.#state.data.isFriend) {
        this.addFriendButton.textContent = 'Remove friend';
        this.addFriendButton.addEventListener('click', this.removeFriend);
      } else {
        this.addFriendButton.textContent = 'Add friend';
        this.addFriendButton.addEventListener('click', this.addFriend);
      }
    }

    this.blockUserButton = this.querySelector('#block-user-button');
    this.blockUserButton.style.display = 'block';
    if (this.#state.data.isBlocked) {
      this.blockUserButton.textContent = 'Unblock user';
      this.blockUserButton.addEventListener('click', this.unblockUser);
    } else {
      this.blockUserButton.textContent = 'Block user';
      this.blockUserButton.addEventListener('click', this.blockUser);
    }
  }

  async addFriend() {
    const request = { username: this.#state.data.shownUsername };
    const response = await apiRequest(
        'POST',
        /* eslint-disable-next-line new-cap */
        API_ENDPOINTS.USER_FRIENDS(this.#state.data.loggedInUsername),
        request,
        false,
        true,
    );
    if (response.success) {
      this.#state.data.isFriend = true;
      this.render();
    } else {
      console.error('Error adding friend:', response);
      showAlertMessageForDuration(ALERT_TYPE.ERROR, this.#state.isMyProfile.addFriend, 3000);
    }
  }

  async removeFriend() {
    const response = await apiRequest(
        'DELETE',
        /* eslint-disable-next-line new-cap */
        API_ENDPOINTS.USER_REMOVE_FRIEND(this.#state.data.loggedInUsername, this.#state.data.shownUsername),
        null,
        false,
        true,
    );
    if (response.success) {
      this.#state.data.isFriend = false;
      this.render();
    } else {
      console.error('Error removing friend:', response);
      showAlertMessageForDuration(ALERT_TYPE.ERROR, this.#state.isMyProfile.removeFriend, 3000);
    }
  }

  async blockUser() {
    const request = { username: this.#state.data.shownUsername };
    const response = await apiRequest(
        'POST',
        /* eslint-disable-next-line new-cap */
        API_ENDPOINTS.USER_BLOCKED_USERS(this.#state.data.loggedInUsername),
        request,
        false,
        true,
    );
    if (response.success) {
      this.#state.data.isBlocked = true;
      this.#state.data.isFriend = false;
      this.render();
    } else {
      console.error('Error blocking user:', response);
      showAlertMessageForDuration(ALERT_TYPE.ERROR, this.#state.isMyProfile.blockUser, 3000);
    }
  }

  async unblockUser() {
    const response = await apiRequest(
        'DELETE',
        /* eslint-disable-next-line new-cap */
        API_ENDPOINTS.USER_UNBLOCK_USER(this.#state.data.loggedInUsername, this.#state.data.shownUsername),
        null,
        false,
        true,
    );
    if (response.success) {
      this.#state.data.isBlocked = false;
      this.render();
    } else {
      console.error('Error unblocking:', response);
      showAlertMessageForDuration(ALERT_TYPE.ERROR, this.#state.isMyProfile.unblockUser, 3000);
    }
  }

  template() {
    return `
    <div class="d-flex flex-row justify-content-center m-4">
      <button class="btn btn-wood mx-1 profile-user-action-button" id="edit-profile-button">Edit Profile</button>

      <button class="btn btn-wood mx-1 profile-user-action-button" id="add-friend-button"></button>
      <button class="btn btn-wood mx-1 profile-user-action-button" id="send-message-button">Send Message</button>
      <button class="btn btn-wood mx-1 profile-user-action-button" id="block-user-button"></button>
    </div>
    `;
  }

  style() {
    return `
    <style>
      .profile-user-action-button {
        display: none;
      }
    </style>
    `;
  }
}

customElements.define('profile-user-actions', ProfileUserActions);
