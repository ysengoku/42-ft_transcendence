import { mockChatListData } from '@mock/functions/mockChatListData.js';
import './components/index.js';

export class Chat extends HTMLElement {
  constructor() {
    super();
    this.chatData = [];
    this.selectedChatId = null;
    this.socket = null;
  }

  async connectedCallback() {
    // TODO: WebSocket connection
    // this.socket = new WebSocket('url');
    // this.socket.onopen = () => {
    //   console.log('WebSocket connection established');
    // };
    // this.socket.onmessage = this.handleSocketMessage.bind(this);

    this.chatData = await mockChatListData(); // Temporary mock data 
    this.render();
  }

  // ----- TODO --------------------------------
  handleSocketMessage(event) {
    const newMessage = JSON.parse(event.data);
    this.updateChatData(newMessage);
  }

  updateChatData(newMessage) {
  }
  // -------------------------------------------

  render() {
    this.innerHTML = `
      <style>
        #chat-component-container {
          height: calc(100vh - 104px);
        }
        #chat-messages {
          min-height: 0;
        }
      </style>
      <div class="container-fluid d-flex flex-row flex-grow-1 py-4" id="chat-component-container">
        <div class="col-md-3">
          <chat-list-component></chat-list-component>
        </div>

        <div class="col-md-9 chat-messages-area d-flex flex-column h-100 overflow-auto">
          <chat-message-header></chat-message-header>
          <div class="flex-grow-1 overflow-auto" id="chat-messages">
            <chat-message-area></chat-message-area>
          </div>
          <chat-message-input></chat-message-input>
        </div>
      </div>
    `;

    const chatList = this.querySelector('chat-list-component');
    chatList.setData(this.chatData);
  }
}

customElements.define('chat-page', Chat);
