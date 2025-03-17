import { router } from '@router';
import { auth } from '@auth';
import { apiRequest, API_ENDPOINTS } from '@api';
import { socketManager } from '@socket';
import { isMobile } from '@utils';
import './components/index.js';
import { mockChatListData } from '@mock/functions/mockChatListData.js';
import { mockChatMessagesData } from '@mock/functions/mockChatMessages';

export class Chat extends HTMLElement {
  #state = {
    user: null,
    currentChatIndex: 0,
    chatListItemCount: 0,
    currentChatMessageIndex: 0,
    currentChatMessageCount: 0,
  };

  constructor() {
    super();
    this.chatListData = [];
    this.currentChat = {
      username: '',
      nickname: '',
      avatar: '',
      isOnline: false,
      isBlockedUser: false,
      isBlockedByUser: false,
      messages: [],
    };

    this.handleChatItemSelected = this.handleChatItemSelected.bind(this);
    this.handleSendMessage = this.handleSendMessage.bind(this);
    this.handleWindowResize = this.handleWindowResize.bind(this);
    this.handleBackToChatList = this.handleBackToChatList.bind(this);
  }

  async connectedCallback() {
    this.#state.user = auth.getStoredUser();
    const isLoggedIn = this.#state.user ? true : false;
    if (!isLoggedIn) {
      router.navigate('/login');
    }
    // ----- Temporary mock data -------------------------
    this.mockData = await mockChatListData();
    this.chatListData = this.mockData.items;
    this.#state.chatListItemCount = this.mockData.count;
    // ---------------------------------------------------

    // this.chatListData = await this.fetchChatList();
    if (this.#state.chatListItemCount > 0) {
      this.currentChat = {
        username: this.chatListData[0].username,
        nickname: this.chatListData[0].nickname,
        avatar: this.chatListData[0].avatar,
        isOnline: this.chatListData[0].is_online,
        isBlockedUser: this.chatListData[0].is_blocked,
        isBlockedByUser: this.chatListData[0].is_blocked_by_user,
      };
      this.chatListData[0].unread_messages_count = 0;
    }
    this.render();
  }

  disconnectedCallback() {
    document.removeEventListener('chatItemSelected', this.handleChatItemSelected);
    document.removeEventListener('sendMessage', this.handleSendMessage);
    window.removeEventListener('resize', this.handleWindowResize);
    this.backButton?.removeEventListener('click', this.handleBackToChatList);
  }

  async render() {
    this.innerHTML = this.template() +this.style();

    this.chatListContainer = this.querySelector('#chat-list-container');
    this.chatContainer = this.querySelector('#chat-container');
    this.chatMessagesArea = document.querySelector('chat-message-area');
    this.chatList = this.querySelector('chat-list-component');
    this.backButton = this.querySelector('#back-to-chat-list');

    this.chatList.setData(this.chatListData, this.#state.chatListItemCount);
    if (this.#state.chatListItemCount > 1) {
      // this.renderCurrentChat();
      await this.fetcheCurrentChatMeggages();
      this.chatMessagesArea.setData(this.currentChat);
    }

    document.addEventListener('chatItemSelected', this.handleChatItemSelected);
    document.addEventListener('sendMessage', this.handleSendMessage);

    socketManager.addListener('chat', (message) => this.handleNewMessage(message));

    window.addEventListener('resize', this.handleWindowResize);
    this.backButton.addEventListener('click', this.handleBackToChatList);
  }

  async fetchChatList() {
    const response = await apiRequest(
        /* eslint-disable-next-line new-cap */
        'GET', API_ENDPOINTS.CHAT_LIST(10, this.#state.currentChatIndex), null, false, true);
    if (response.success) {
      console.log('Chat list response:', response);
      this.chatListData = response.data.items;
      this.#state.chatListItemCount = response.data.count;
      return this.chatListData;
    } else {
      // TODO: Handle error
    }
  }
  
  async updateChatList(newMessage) {
    // TODO
    // Update chat list with new message notification
  }

  async fetcheCurrentChatMeggages() {
    // ----- Temporary mock data ---------------------------------------
    const data = await mockChatMessagesData(this.currentChat.username);
    this.currentChat.messages = data;
    this.chatMessagesArea.setData(this.currentChat);
    // -----------------------------------------------------------------
  }

  async handleChatItemSelected(event) {
    this.currentChat = {
      username: event.detail.username,
      nickname: event.detail.nickname,
      avatar: event.detail.avatar,
      isOnline: event.detail.is_online,
      isBlockedUser: event.detail.is_blocked,
      isBlockedByUser: event.detail.is_blocked_by_user,
    };
    if (event.detail.messages) {
      this.currentChat.messages = event.detail.messages;
      this.chatMessagesArea.setData(this.currentChat);
    } else {
      await this.fetcheCurrentChatMeggages();
    }

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

          id: this.currentChat.messages.length + 1,
          sender: this.#state.user.username,
          content: event.detail,
          date: new Date().toISOString(),
          is_liked: false,
          is_read: false,
        
      },
    };
    console.log('Message data:', messageData);
    // ----- Temporary message sending handler -----------------------------
    this.currentChat.messages.unshift(messageData.data);
    this.chatMessagesArea.setData(this.currentChat);
    socketManager.socket.send(JSON.stringify(messageData));
    // ---------------------------------------------------------------------
  }

  handleNewMessage(message) {
    console.log('New message:', message);
    const newMessage = message;
    //----- For test --------------------------------
    newMessage.sender = this.currentChat.username;
    //-----------------------------------------------
    if (newMessage.sender === this.currentChat.username) {
      this.currentChat.messages.unshift(newMessage);
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
