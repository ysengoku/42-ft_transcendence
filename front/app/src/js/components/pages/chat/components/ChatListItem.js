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
    // console.log('Data: ', this._data);
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
    const chatMessages = document.querySelector('chat-message-area');
    listItem.addEventListener('click', () => {
      // chatMessages.setId(Number(this._data.id));
      listItem.classList.add('active');
      for (const item of document.querySelectorAll('.list-group-item')) {
        if (item !== listItem) {
          item.classList.remove('active');
        }
      }
      const event = new CustomEvent('chatItemSelected', { detail: this._data.id, bubbles: true });
      this.dispatchEvent(event);
    });
  }

  setLastMessageTime(time) {
    const date = new Date(time);
    // TODO: Add logic to format the date
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
