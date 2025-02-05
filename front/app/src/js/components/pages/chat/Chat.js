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
      </style>
      <div class="container-fluid d-flex flex-row flex-grow-1 py-4" id="chat-component-container">
        <div class="col-12 col-md-4" id="chat-list-area">
          <chat-list-component></chat-list-component>
        </div>

        <div class="col-12 col-md-8 d-none d-md-block" id="chat-messages-container">
          <div class="d-flex flex-column h-100 overflow-auto">
            <button class="btn btn-secondry mt-2 text-start d-md-none mb-3" id="back-to-chat-list">
              <i class="bi bi-arrow-left"></i>
               Back
            </button>
            <div class="flex-grow-1">
              <chat-message-area></chat-message-area>
            </div>
            <chat-message-input></chat-message-input>
          </div>
        </div>
      </div>
    `;

    const chatList = this.querySelector('chat-list-component');
    chatList.setData(this.chatData);

    const chatListArea = this.querySelector('#chat-list-area');
    const chatMessageArea = this.querySelector('#chat-messages-container');
    const backButton = this.querySelector('#back-to-chat-list');
    document.addEventListener('chatItemSelected', (event) => {
      if (window.innerWidth < 768) {
        chatListArea.classList.add('d-none');
        chatMessageArea.classList.remove('d-none', 'd-md-block');
      }
    });
    backButton.addEventListener('click', () => {
      chatListArea.classList.remove('d-none');
      chatMessageArea.classList.add('d-none');
    });

    // TODO: Resize event seems to be not working
    document.addEventListener('resize', () => {
      console.log('Resize event');
      if (window.innerWidth >= 768) {
        chatListArea.classList.remove('d-none');
        chatMessageArea.classList.remove('d-none');
      }
    });
  }
}

customElements.define('chat-page', Chat);
