import { getRelativeTime } from '@utils';
import defaultAvatar from '/img/default_avatar.png?url';

export class ChatListItem extends HTMLElement {
  #state = {
    data: '',
    itemCount: 0,
    loggedInUsername: '',
  };

  constructor() {
    super();

    this.handleChatItemSelected = this.handleChatItemSelected.bind(this);
  }

  setData(data, loggedInUsername) {
    this.#state.data = data;
    this.#state.loggedInUsername = loggedInUsername;
    this.render();
  }

  disconnectedCallback() {
    this.listItem?.removeEventListener('click', this.handleChatItemSelected);
  }

  render() {
    this.innerHTML = this.template();

    this.avatar = this.querySelector('.chat-list-item-avatar');
    this.#state.data.avatar ? (this.avatar.src = this.#state.data.avatar) : (this.avatar.src = defaultAvatar);

    this.nickname = this.querySelector('.chat-list-item-nickname');
    this.nickname.textContent = this.#state.data.nickname;

    this.lastMessageTime = this.querySelector('.chat-list-item-last-message-time');
    this.lastMessage = this.querySelector('.chat-list-item-last-message');
    this.unreadMessages = this.querySelector('.chat-list-item-unread-message');
    if (this.#state.data.last_message) {
      this.renderLastMessage();
    } else {
      this.lastMessage.textContent = 'No messages yet';
      this.unreadMessages.classList.add('d-none');
    }

    this.listItem = this.querySelector('.chat-list-item');
    this.listItem.setAttribute('id', `chat-item-${this.#state.data.username}`);
    this.addEventListener('click', this.handleChatItemSelected);
    if (this.#state.data.is_blocked_user) {
      this.listItem.classList.add('blocked');
    }
  }

  renderLastMessage() {
    if (this.#state.data.is_blocked_user) {
      this.lastMessage.textContent = 'You have blocked this user';
      this.unreadMessages.classList.add('d-none');
      return;
    }
    this.lastMessageTime.textContent = getRelativeTime(this.#state.data.last_message.date);
    let content =
      this.#state.data.last_message.sender.toLowerCase() === this.#state.loggedInUsername.toLowerCase() ? 'You: ' : '';
    content += this.#state.data.last_message.content;
    this.lastMessage.textContent = content;
    if (this.#state.data.unread_messages_count === 0) {
      this.unreadMessages.classList.add('d-none');
    } else {
      this.unreadMessages.textContent =
        this.#state.data.unread_messages_count > 9 ? '9+' : this.#state.data.unread_messages_count;
    }
  }

  /* ------------------------------------------------------------------------ */
  /*     Event handlers                                                       */
  /* ------------------------------------------------------------------------ */

  handleChatItemSelected() {
    this.listItem.classList.add('active');
    const unreadMessageCount = this.listItem.querySelector('.chat-list-item-unread-message');
    unreadMessageCount.classList.add('d-none');
    const chatListItems = document.querySelectorAll('.chat-list-item');
    chatListItems.forEach((item) => {
      if (item !== this.listItem) {
        item.classList.remove('active');
      }
    });
    const event = new CustomEvent('chatItemSelected', { detail: this.#state.data.username, bubbles: true });
    this.dispatchEvent(event);
  }

  /* ------------------------------------------------------------------------ */
  /*     Template & style                                                     */
  /* ------------------------------------------------------------------------ */

  template() {
    return `
    <li class="chat-list-item list-group-item me-4 mb-2">
      <div class="list-item d-flex flex-row align-items-center py-2">

        <div class="d-inline-block position-relative">
          <img class="chat-list-item-avatar avatar-m rounded-circle" alt="User" />
          <span class="online-status chat-list-status-indicator ${this.#state.data.is_online ? 'online' : ''} ms-3"></span>
        </div>

        <div class="chat-list-item-content d-flex flex-column justify-content-start px-3 py-2 gap-1 flex-grow-1">
          <div class="d-flex flex-wrap justify-content-between align-items-center">
            <p class="chat-list-item-nickname fs-5 m-0"></p>
            <p class="chat-list-item-last-message-time m-0 fs-6"></p>
          </div>
          <p class="chat-list-item-last-message m-0 fs-6"></p>
        </div>

        <div class="d-inline-block">
          <div class="chat-list-item-unread-message"></div>
        </div>
      </div>
    </li>
    `;
  }
}

customElements.define('chat-list-item-component', ChatListItem);
