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
    this.innerHTML = this.template() + this.style();

    this.avatar = this.querySelector('.chat-list-item-avatar');
    this.#state.data.avatar ? (this.avatar.src = this.#state.data.avatar) : (this.avatar.src = defaultAvatar);

    this.nickname = this.querySelector('.chat-list-item-nickname');
    this.nickname.textContent = this.#state.data.nickname;

    this.lastMessageTime = this.querySelector('.chat-list-item-last-message-time');
    this.lastMessage = this.querySelector('.chat-list-item-last-message');
    this.unreadMessages = this.querySelector('.chat-list-item-unread-message');
    if (this.#state.data.last_message) {
      this.lastMessageTime.textContent = getRelativeTime(this.#state.data.last_message.date);
      let content = this.#state.data.last_message.sender.toLowerCase() === this.#state.loggedInUsername.toLowerCase() ?
        'You: ' : this.#state.data.nickname + ': ';
      content += this.#state.data.last_message.content;
      this.lastMessage.textContent = content;
      if (this.unreadMessages) {
        this.unreadMessages.textContent =
          this.#state.data.unread_messages_count > 9 ? '9+' : this.#state.data.unread_messages_count;
      }
    } else {
      this.lastMessage.textContent = 'No messages yet';
    }

    this.listItem = this.querySelector('.chat-list-item');
    this.addEventListener('click', this.handleChatItemSelected);
  }

  /* ------------------------------------------------------------------------ */
  /*     Event handlers                                                       */
  /* ------------------------------------------------------------------------ */

  handleChatItemSelected() {
    this.listItem.classList.add('active');
    const circleNumber = this.listItem.querySelector('.circle-number');
    if (circleNumber) {
      circleNumber.remove();
    }
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
      <div class="list-item d-flex flex-row align-items-center py-2 gap-3">

        <div class="d-inline-block position-relative">
          <img class="chat-list-item-avatar avatar-m rounded-circle" alt="User" />
          <span class="online-status chat-list-status-indicator ${this.#state.data.is_online ? 'online' : ''} ms-3"></span>
        </div>

        <div class="d-flex flex-column justify-content-start py-2 gap-1 flex-grow-1">
          <div class="d-flex flex-wrap justify-content-between align-items-center">
            <p class="chat-list-item-nickname fs-5 m-0 me-2"></p>
            <p class="chat-list-item-last-message-time m-0 fs-6"></p>
          </div>
          <p class="chat-list-item-last-message m-0 fs-6"></p>
        </div>

        <div class="d-inline-block">
          ${ this.#state.data.unread_messages_count > 0 ?
            `<div class="chat-list-item-unread-message circle-number"></div>` : '' }
        </div>
      </div>
    </li>
    `;
  }

  style() {
    return `
      <style>
      .chat-list-item {
        border: none;
        background-color: rgba(var(--bs-body-bg-rgb), 0.3);
        border-radius: 0.5rem !important;
      }
      .list-group-item.active {
        background-color: var(--pm-primary-500) !important;
        border: none;
        .chat-list-status-indicator {
          border-color: var(--pm-primary-500)
        }
      }
      .chat-list-status-indicator {
        position: absolute;
        bottom: 0;
        right: -2px;
        border: 1px solid var(--bs-body-bg);
      }
      .circle-number {
        background-color: red;
        color: white;
        border-radius: 50%;
        width: 24px;
        height: 24px;
        font-size: 0.8rem;
        display: flex;
        align-items: center;
        justify-content: center;
        inline-height: 1;
       }
      .chat-list-item-last-message {
        color: var(--bs-text-light);
        overflow: hidden;
        text-overflow: ellipsis;
        display: -webkit-box;
        -webkit-line-clamp: 1;
        -webkit-box-orient: vertical;
      }
    </style>
    `;
  }
}

customElements.define('chat-list-item-component', ChatListItem);
