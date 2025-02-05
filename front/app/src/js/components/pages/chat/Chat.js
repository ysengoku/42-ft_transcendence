import { socket } from '@socket';
import './components/index.js';
import { mockChatListData } from '@mock/functions/mockChatListData.js';
import { mockChatMessagesData } from '@mock/functions/mockChatMessages';

export class Chat extends HTMLElement {
  constructor() {
    super();
    this.socket = null;
    this.chatListData = [];
    this.currentChatId = null;
    this.currentChat = [];
  }

  async connectedCallback() {
    this.chatListData = await mockChatListData(); // Temporary mock data
    this.currentChatId = this.chatListData[0].id;
    this.render();
  }

  async updateCurrentChat() {
    const chatMessages = document.querySelector('chat-message-area');
    const data = await mockChatMessagesData(this.currentChatId);
    this.currentChat = data;
    chatMessages.setData(this.currentChat);
  }

  handleNewMessage(message) {
    console.log('New message:', message);
    const newMessage = message;
    if (newMessage.id === this.currentChatId) {
      this.currentChat.messages.push(newMessage.message);
      const chatMessages = document.querySelector('chat-message-area');
      chatMessages.setData(this.currentChat);
    }
    const chatList = document.querySelector('chat-list-component');
    chatList.updateChatList(newMessage);
  }

  setEventListeners() {
    const chatListArea = this.querySelector('#chat-list-area');
    const chatMessageContainer = this.querySelector('#chat-messages-container');
    const backButton = this.querySelector('#back-to-chat-list');

    document.addEventListener('chatItemSelected', (event) => {
      this.currentChatId = event.detail;
      console.log('Chat ID:', this.currentChatId);
      this.updateCurrentChat();

      if (window.innerWidth < 768) {
        chatListArea.classList.add('d-none');
        chatMessageContainer.classList.remove('d-none', 'd-md-block');
      }
    });
    backButton.addEventListener('click', () => {
      chatListArea.classList.remove('d-none');
      chatMessageContainer.classList.add('d-none');
    });

    // TODO: Resize event seems to be not working
    document.addEventListener('resize', () => {
      console.log('Resize event');
      if (window.innerWidth >= 768) {
        chatListArea.classList.remove('d-none');
        chatMessageContainer.classList.remove('d-none');
      }
    });

    // TODO: Send message event
    document.addEventListener('sendMessage', (event) => {
      console.log('Send message event:', event.detail);
      const storedUser = localStorage.getItem('user');
      const senderUsername = JSON.parse(storedUser).username;

      // Send message to the server
      // TODO: Adjust data to our server
      const messageData = {
        type: 'chat',
        data: {
          id: this.currentChatId,
          message: {
            id: this.currentChat.messages.length + 1,
            sender: senderUsername,
            message: event.detail,
            timestamp: new Date().toISOString(),
          },
        }
      };
      console.log('Message data:', messageData);
      // ----- Temporary message sending handler -----------------------------
      this.currentChat.messages.push(messageData.data.message);
      const chatMessages = document.querySelector('chat-message-area');
      chatMessages.setData(this.currentChat);
      socket.socket.send(JSON.stringify(messageData));
      // ---------------------------------------------------------------------
    });
  }

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
          </div>
        </div>
      </div>
    `;

    const chatList = this.querySelector('chat-list-component');
    chatList.setData(this.chatListData);
    this.updateCurrentChat();
    this.setEventListeners();
    socket.addListener('chat', (message) => this.handleNewMessage(message));
  }
}

customElements.define('chat-page', Chat);
