import { getRelativeTime } from '@utils';
import defaultAvatar from '/img/default_avatar.png?url';

export class ChatListItem extends HTMLElement {
  #state = {
    data: '',
    itemCount: 0,
  };

  constructor() {
    super();
    this._data = '';
  }

  setData(data) {
    this._data = data;
    this.render();
  }

  disconnectedCallback() {
    this.listItem?.removeEventListener('chatItemSelected', this.handleChatItemSelected);
  }

  render() {
    if (!this._data.last_message) {
      return;
    }
    this.innerHTML = this.template() + this.style();

    this.avatar = this.querySelector('.chat-list-item-avatar');
    this._data.avatar ? this.avatar.src = this._data.avatar : this.avatar.src = defaultAvatar;

    this.nickname = this.querySelector('.chat-list-item-nickname');
    this.nickname.textContent = this._data.nickname;

    this.lastMessageTime = this.querySelector('.chat-list-item-last-message-time');
    this.lastMessageTime.textContent = getRelativeTime(this._data.last_message.date);

    this.lastMessage = this.querySelector('.chat-list-item-last-message');
    this.lastMessage.textContent = this._data.last_message.content;

    this.unreadMessages = this.querySelector('.chat-list-item-unread-message');
    if (this.unreadMessages) {
      this.unreadMessages.textContent = this._data.unread_messages_count > 9 ? '9+' : this._data.unread_messages_count;
    }

    this.listItem = this.querySelector('#chat-list-item');

    this.handleChatItemSelected = ('click', () => {
      this.listItem.classList.add('active');
      const circleNumber = this.listItem.querySelector('.circle-number');
      if (circleNumber) {
        circleNumber.remove();
      }
      const chatListItems = document.querySelectorAll('.list-group-item');
      chatListItems.forEach((item) => {
        if (item !== this.listItem) {
          item.classList.remove('active');
        }
      });
      const event = new CustomEvent('chatItemSelected', { detail: this._data, bubbles: true });
      this.dispatchEvent(event);
    });

    this.listItem.addEventListener('click', this.handleChatItemSelected);
  }

  template() {
    return `
    <li class="list-group-item me-3" id="chat-list-item">
      <div class="list-item d-flex flex-row align-items-center py-2 gap-3">

        <div class="d-inline-block">
          <img class="chat-list-item-avatar rounded-circle" alt="User" />
        </div>

        <div class="d-flex flex-column justify-content-start py-2 gap-1 flex-grow-1">
          <div class="d-flex flex-wrap justify-content-between align-items-center">
            <div class="chat-list-item-nickname fs- me-2"></div>
            <small class="chat-list-item-last-message-time"></small>
          </div>
          <small class="chat-list-item-last-message"></small>
        </div>

        <div class="d-inline-block">
          ${ this._data.unread_messages_count > 0 ?
            `<div class="chat-list-item-unread-message circle-number"></div>` : '' }
        </div>
      </div>
    </li>
    `;
  }

  style() {
    return `
      <style>
      .list-group-item {
        border: none;
        border-top: 1px solid var(--bs-border-color);
        background-color: transparent;
      }
      .list-item img {
        width: 52px;
        height: 52px;
        object-fit: cover;
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
    </style>
    `;
  }
}

customElements.define('chat-list-item-component', ChatListItem);
