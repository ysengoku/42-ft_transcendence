export class ChatListItem extends HTMLElement {
  constructor() {
    super();
    this._data = {
      id: null,
      nickname: '',
      avatar: '',
      last_message: '',
      last_message_time: '',
      unread_messages: 0,
    };
  }

  setData(data) {
    this._data = data;
    this.render();
  }

  render() {
    const lastMessageTime = this.setLastMessageTime(this._data.last_message_time);

    this.innerHTML = `
    <style>
      .list-group-item {
        border: none;
        border-bottom: 1px solid var(--bs-border-color);
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
      <li class="list-group-item" id="chat-list-item">
        <div class="list-item d-flex flex-row align-items-center py-2 gap-3">
          <img src="${this._data.avatar}" class="rounded-circle" alt="User" />

          <div class="d-flex flex-column justify-content-start py-2 gap-1 flex-grow-1">
            <div class="d-flex flex-row justify-content-between align-items-center">
              <div class="fs-5">${this._data.nickname}</div>
              <small>${lastMessageTime}</small>
            </div>
            <small>${this._data.last_message}</small>
          </div>
          ${this._data.unread_messages > 0 ?
            `<div class="circle-number">${this._data.unread_messages > 9 ?
              '9+' :
              this._data.unread_messages}</div>` :
            ''}
        </div>
      </li>
    `;

    const listItem = this.querySelector('#chat-list-item');
    listItem.addEventListener('click', () => {
      listItem.classList.add('active');
      const circleNumber = listItem.querySelector('.circle-number');
      if (circleNumber) {
        circleNumber.remove();
      }
      const chatListItems = document.querySelectorAll('.list-group-item');
      chatListItems.forEach((item) => {
        if (item !== listItem) {
          item.classList.remove('active');
        }
      });
      const event = new CustomEvent('chatItemSelected', { detail: this._data.id, bubbles: true });
      this.dispatchEvent(event);
    });
  }

  setLastMessageTime(time) {
    console.log('Time:', time);
    const now = new Date();
    const date = new Date(time);
    const diff = now - date;

    if (diff < 60000) {
      return 'now';
    }
    if (diff < 3600000) {
      return `${Math.floor(diff / 60000)}m ago`;
    }
    if (diff < 86400000) {
      return `${Math.floor(diff / 3600000)}h ago`;
    }
    if (diff < 172800000) {
      return 'yesterday';
    }
    if (diff < 604800000) {
      return `${Math.floor(diff / 86400000)}days ago`;
    }
    const formatedDate = new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: false,
    }).format(date);
    return formatedDate;
  }
}

customElements.define('chat-list-item-component', ChatListItem);
