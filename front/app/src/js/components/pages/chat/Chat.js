import { router } from '@router';
import { auth } from '@auth';
import { socketManager } from '@socket';
import { isMobile } from '@utils';
import './components/index.js';
import { mockChatListData } from '@mock/functions/mockChatListData.js';
import { mockChatMessagesData } from '@mock/functions/mockChatMessages';

export class Chat extends HTMLElement {
  constructor() {
    super();
    this.user = auth.getStoredUser();
    this.chatListData = [];
    this.currentChatId = null;
    this.currentChat = [];

    this.handleChatItemSelected = this.handleChatItemSelected.bind(this);
    this.handleSendMessage = this.handleSendMessage.bind(this);
    this.handleWindowResize = this.handleWindowResize.bind(this);
    this.handleBackToChatList = this.handleBackToChatList.bind(this);
  }

  async connectedCallback() {
    const isLoggedIn = this.user ? true : false;
    if (!isLoggedIn) {
      router.navigate('/login');
    }
    this.chatListData = await mockChatListData(); // Temporary mock data
    this.currentChatId = this.chatListData[0].id;
    this.chatListData[0].unread_messages = 0;

    this.render();
  }

  disconnectedCallback() {
    document.removeEventListener('chatItemSelected', this.handleChatItemSelected);
    document.removeEventListener('sendMessage', this.handleSendMessage);
    window.removeEventListener('resize', this.handleWindowResize);
    this.backButton?.removeEventListener('click', this.handleBackToChatList);
  }

  render() {
    this.innerHTML = this.template() +this.style();

    this.chatListContainer = this.querySelector('#chat-list-container');
    this.chatContainer = this.querySelector('#chat-container');
    this.chatMessagesArea = document.querySelector('chat-message-area');
    this.chatList = this.querySelector('chat-list-component');
    this.backButton = this.querySelector('#back-to-chat-list');

    this.chatList.setData(this.chatListData);
    this.updateCurrentChat();

    document.addEventListener('chatItemSelected', this.handleChatItemSelected);
    document.addEventListener('sendMessage', this.handleSendMessage);

    socketManager.addListener('chat', (message) => this.handleNewMessage(message));

    window.addEventListener('resize', this.handleWindowResize);
    this.backButton.addEventListener('click', this.handleBackToChatList);
  }

  async updateCurrentChat() {
    const data = await mockChatMessagesData(this.currentChatId);
    this.currentChat = data;
    this.currentChat.unread_messages = 0;
    console.log('Current chat:', this.currentChat);
    this.chatMessagesArea.setData(this.currentChat);
  }

  async updateChatList(newMessage) {
    // TODO
    // fetch new chat list data and render
  }

  handleChatItemSelected(event) {
    this.currentChatId = event.detail;
    console.log('Chat ID:', this.currentChatId);
    this.updateCurrentChat();

    if (isMobile()) {
      this.chatListContainer.classList.add('d-none');
      this.chatContainer.classList.remove('d-none', 'd-md-block');
    }
  }

  // TODO: Send message event
  handleSendMessage(event) {
    console.log('Send message event:', event.detail);

    // Send message to the server
    // TODO: Adjust data to our server
    const messageData = {
      type: 'chat',
      data: {
        id: this.currentChatId,
        message: {
          id: this.currentChat.messages.length + 1,
          sender: this.user.username,
          message: event.detail,
          timestamp: new Date().toISOString(),
        },
      },
    };
    console.log('Message data:', messageData);
    // ----- Temporary message sending handler -----------------------------
    this.currentChat.messages.push(messageData.data.message);
    this.chatMessagesArea.setData(this.currentChat);
    socketManager.socket.send(JSON.stringify(messageData));
    // ---------------------------------------------------------------------
  }

  handleNewMessage(message) {
    console.log('New message:', message);
    const newMessage = message;
    if (newMessage.id === this.currentChatId) {
      this.currentChat.messages.push(newMessage.message);
      this.chatMessagesArea.setData(this.currentChat);
    }

    this.updateChatList(newMessage);
  }

  handleWindowResize() {
    if (!isMobile()) {
      this.chatListContainer.classList.remove('d-none');
      this.chatContainer.classList.remove('d-none');
    }
  }

  handleBackToChatList() {
    this.chatListContainer.classList.remove('d-none');
    this.chatContainer.classList.add('d-none');
  }

  template() {
    return `
    <div class="container-fluid d-flex flex-row flex-grow-1 py-4" id="chat-component-container">
      <div class="col-12 col-md-4" id="chat-list-container">
        <chat-list-component></chat-list-component>
      </div>

      <div class="col-12 col-md-8 d-none d-md-block" id="chat-container">
        <div class="d-flex flex-column h-100">
          <button class="btn btn-secondry mt-2 text-start d-md-none mb-3" id="back-to-chat-list">
            <i class="bi bi-arrow-left"></i>
             Back
          </button>
          <div class="flex-grow-1 overflow-auto">
            <chat-message-area></chat-message-area>
          </div>
        </div>
      </div>
    </div>
    `;
  }

  style() {
    return `
    <style>
      #chat-component-container {
        height: calc(100vh - 104px);
      }
      /style>
    `;
  }
}

customElements.define('chat-page', Chat);
