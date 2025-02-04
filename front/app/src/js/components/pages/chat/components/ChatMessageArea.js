import { mockChatMessagesData } from "@mock/functions/mockChatMessages";

export class ChatMessageArea extends HTMLElement {
  constructor() {
	  super();
    this.id = -1;
    this._data = {
      username: '',
      nickname: '',
      avatar: '',
      is_online: false,
      message: [],
    };
  }

  connectedCallback() {
    // TODO: Show the latest messages
    this.id = 1;
    this.fetchMessages();
  }

  setId(value) {
    this.id = value;
    this.fetchMessages();
  }
  
  async fetchMessages() {
    // Fetch messages from the server
    
    // temporary mock data
    const data = await mockChatMessagesData(this.id);
    this._data = data;
    console.log('Chat messages:', this._data);
    this.render();
  }

  render() {
    console.log('Data:', this._data);
    this.innerHTML = `
	  <style>
      #chat-messages {
        min-height: 0;
      }
      #message-area-header {
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
	    .message {
          display: flex;
          justify-content: flex-start;
          margin-bottom: 10px;
      }
      .message.text-end {
          justify-content: flex-end;
      }
      .bubble {
          display: inline-block;
          padding: 10px 15px;
          border-radius: 20px;
          background-color: #f1f1f1;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          color: black;
      }
      .message.text-end .bubble {
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
    <div class="d-flex flex-row justify-content-start align-items-center border-bottom ps-4 py-3 gap-3 sticky-top">
      <img src="${this._data.avatar}" class="rounded-circle" alt="User" id="message-area-header"/>
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
    
    <div class="overflow-auto" id="chat-messages">
	    <div class="p-3" id="chat-messages">

        <div class="d-flex flex-row align-items-center text-start mb-2 gap-3">
          <img src="/media/avatars/sample_avatar.jpg" class="chat-message-avatar rounded-circle" alt="User" />

          <div class="message">
            <div class="bubble">
              Hello!
            </div>
          </div>
        </div>

        <div class="message text-end mb-2">
          <div class="bubble">
            Hi! How are you?
        </div>
      </div>
    </div>
	`;
  }
}

customElements.define('chat-message-area', ChatMessageArea);
