export class ChatMessageArea extends HTMLElement {
  constructor() {
    super();
    this._data = [];
  }

  setData(data) {
    this._data = data;
    this.render();
  }

  renderMessages() {
    const chatMessages = this.querySelector('#chat-messages');
    chatMessages.innerHTML = '';
    for (const message of this._data.messages) {
      const messageElement = document.createElement('div');
      if (message.sender === this._data.username) {
        messageElement.classList.add(
            'left-align-message', 'd-flex', 'flex-row', 'justify-content-start',
            'align-items-center', 'gap-3',
        );
        messageElement.innerHTML = `
          <img src="${this._data.avatar}" class="chat-message-avatar rounded-circle" alt="User" />
          <div class="message">
            <div class="bubble">
              ${message.message}
            </div>
          </div>
        `;
      } else {
        messageElement.classList.add('right-align-message', 'd-flex', 'flex-row', 'justify-content-end',
            'align-items-center');
        messageElement.innerHTML = `
          <div class="bubble">
            ${message.message}
          </div>
        `;
      }
      chatMessages.appendChild(messageElement);
      // Scroll to the bottom of the chat messages
      chatMessages.scrollTop = chatMessages.scrollHeight;
    }
  }

  render() {
    this.innerHTML = `
	  <style>
      #chat-messages {
        min-height: 0;
      }
      #chat-message-header-avatar {
        width: 52px;
        height: 52px;
        object-fit: cover;
      }
      .online-status {
        width: 12px;
        height: 12px;
        border-radius: 50%;
        background-color: grey;
      }
      .online-status.online {
        background-color: green;
      }
      .left-align-message {
        padding-right: 32px;
        margin-bottom: 24px;
      }
      .right-align-message {
        margin-left: 80px;
        margin-bottom: 24px;
      }
      .bubble {
          display: inline-block;
          padding: 10px 15px;
          border-radius: 20px;
          background-color: #f1f1f1;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          color: black;
      }
      .right-align-message .bubble {
          background-color: #007bff;
          color: white;
      }
      .chat-message-avatar {
        width: 36px;
        height: 36px;
        object-fit: cover;
        border-radius: 50%;
      }
	  </style>
    <div class="d-flex flex-column h-100">

      <!-- Header -->
      <div class="d-flex flex-row justify-content-start align-items-center border-bottom bg-dark ps-4 py-3 gap-3 sticky-top">
        <img src="${this._data.avatar}" class="rounded-circle" alt="User" id="chat-message-header-avatar"/>
        <div class="d-flex flex-column text-start">
          <div class="d-flex flex-row align-items-center gap-3">
            <h5>${this._data.nickname}</h5>
            <small>@${this._data.username}</small>
          </div>
          <div class="d-flex flex-row align-items-center gap-2">
            <span class="online-status ${this._data.is_online ? 'online' : ''}"></span>
            ${this._data.is_online ? 'online' : 'offline'}
          </div>
        </div>
      </div>

      <!-- Messages -->
      <div class="flex-grow-1 overflow-auto ps-4 pe-3 pt-4 pb-3" id="chat-messages"></div>

      <!-- Input -->
      <div>
        <chat-message-input></chat-message-input>
      </div>
    </div>
	  `;
    this.renderMessages();
  }
}

customElements.define('chat-message-area', ChatMessageArea);
