import { apiRequest, API_ENDPOINTS } from '@api';
import { showAlertMessage, showAlertMessageForDuration, ALERT_TYPE } from '@utils';
import defaltAvatar from '/img/default_avatar.png?url';

export class ChatUserSearchItem extends HTMLElement {
  #state = {
    user: null,
  };

  constructor() {
    super();
    this.startChat = this.startChat.bind(this);
  }

  set data(value) {
    this.#state.user = value;
    this.render();
  }

  disconnetedCallback() {
    this.removeEventListener('click', this.startChat);
  }

  /* ------------------------------------------------------------------------ */
  /*     Render                                                               */
  /* ------------------------------------------------------------------------ */

  render() {
    this.innerHTML = this.style() + this.template();

    const avatar = this.#state.user.avatar ? this.#state.user.avatar : defaltAvatar;
    this.querySelector('.chat-user-search-avatar').src = avatar;
    this.querySelector('.userlist-nickname').textContent = this.#state.user.nickname;
    this.querySelector('.userlist-username').textContent = `@${this.#state.user.username}`;

    this.chatList = document.querySelector('chat-list-component');
    this.addEventListener('click', this.startChat);
  }

  /* ------------------------------------------------------------------------ */
  /*     Event handlers                                                       */
  /* ------------------------------------------------------------------------ */

  async startChat(event) {
    event.preventDefault();
    event.stopPropagation();
    await this.fetchChatRoom();
  }

  async fetchChatRoom(username = this.#state.user.username) {
    const response = await apiRequest(
      'PUT',
      /* eslint-disable-next-line new-cap */
      API_ENDPOINTS.CHAT(username),
      null,
      false,
      true,
    );
    if (response.success) {
      if (response.data.is_blocked_by_user) {
        showAlertMessageForDuration(
          ALERT_TYPE.ERROR,
          `Chat with ${response.data.nickname} @${response.data.username} is currently unavailable.`,
          3000,
        );
        this.chatList.hideUserSearchBar();
        return;
      }
      if (response.status === 200) {
        this.chatList.restartChat(response.data);
      } else if (response.status === 201) {
        this.chatList.addNewChat(response.data);
      }
    } else {
      if (response.status !== 401 && response.status !== 500) {
        console.error(response.msg);
        showAlertMessage(ALERT_TYPE.ERROR, response.msg);
      }
    }
  }

  /* ------------------------------------------------------------------------ */
  /*     Template & style                                                     */
  /* ------------------------------------------------------------------------ */

  template() {
    return `
    <li class="chat-user-search-list-item dropdown-item border-0 ps-3 py-3">
      <div class="d-flex flex-row align-items-center">
        <div class="position-relative d-inline-block me-2">
          <img class="chat-user-search-avatar avatar-s rounded-circle me-3" alt="Avatar">
          <span class="online-status chat-user-search-status-indicator ${this.#state.user.is_online ? 'online' : ''} ms-3"></span>
        </div>
        <div class="d-flex flex-wrap flex-grow-1 gap-2 overflow-hidden">
          <p class="userlist-nickname m-0 fw-bolder flex-wrap"></P>
          <p class="userlist-username m-0 fs-light flex-nowrap flex-grow-1"></p>
        </div>
      <div>
    </li>
    `;
  }

  style() {
    return `
    <style>
    .chat-user-search-status-indicator {
      position: absolute;
      bottom: 0;
      right: 24%;
      border: 1px solid var(--bs-body-bg);
      width: 12px;
      height: 12px;
    }
    .userlist-nickname,
    .userlist-username {
      overflow: hidden;
      text-overflow: ellipsis;
    }
    </style>
    `;
  }
}

customElements.define('chat-user-search-item', ChatUserSearchItem);
