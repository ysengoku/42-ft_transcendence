import { apiRequest, API_ENDPOINTS } from '@api';
import { showAlertMessage, ALERT_TYPE } from '@utils';
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
    this.innerHTML = this.template() + this.style();

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
      if (response.status === 200) {
        debugger;
        this.chatList.restartChat(response.data);
      } else if (response.status === 201) {
        this.chatList.addNewChat(response.data);
      }
      // const event = new CustomEvent('chatItemSelected', { detail: response.data.username, bubbles: true });
      // this.dispatchEvent(event);
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
    <li class="chat-user-search-list-item list-group-item ps-3 py-2">
      <div class="d-flex flex-row align-items-center">
        <div class="position-relative d-inline-block me-2">
          <img class="chat-user-search-avatar rounded-circle me-3" alt="Avatar">
          <span class="online-status chat-user-search-status-indicator ${this.#state.user.is_online ? 'online' : ''} ms-3"></span>
        </div>
        <div class="d-flex flex-wrap flex-grow-1 gap-2">
          <p class="userlist-nickname m-0 fw-bolder"></P>
          <p class="userlist-username m-0 fs-light"></p>
        </div>
      <div>
    </li>
    `;
  }

  style() {
    return `
    <style>
    .chat-user-search-list-item {
      background-color: rgba(var(--bs-body-bg-rgb), 0.3) !important;
      border: none;
    }
    .chat-user-search-avatar {
      width: 40px;
      height: 40px;
      object-fit: cover;
    }
    .chat-user-search-status-indicator {
      position: absolute;
      bottom: 0;
      right: 24%;
      border: 1px solid var(--bs-body-bg);
      width: 12px;
      height: 12px;
    }
    </style>
    `;
  }
}

customElements.define('chat-user-search-item', ChatUserSearchItem);
