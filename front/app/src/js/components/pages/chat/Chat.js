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
    currentChatUsername: '',
    currentChatIndex: 0,
    chatListItemCount: 0,
  };

  constructor() {
    super();
    this.chatListData = [];
    this.currentChat = null;

    this.handleChatItemSelected = this.handleChatItemSelected.bind(this);
    this.sendMessage = this.sendMessage.bind(this);
    this.toggleLikeMessage = this.toggleLikeMessage.bind(this);
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
    // this.mockData = await mockChatListData();
    // this.chatListData = this.mockData.items;
    // this.#state.chatListItemCount = this.mockData.count;
    // ---------------------------------------------------
    const listData = await this.fetchChatList();
    // TODO: Error handling
    this.chatListData = listData;

    if (this.#state.chatListItemCount > 0) {
      // ----- Temporary mock data ----------------------------------------------
      // const chatData = await mockChatMessagesData(this.chatListData[0].username);
      // ------------------------------------------------------------------------
      this.#state.currentChatUsername = this.chatListData[0].username;
      this.chatListData[0].unread_messages_count = 0;
      const chatData = await this.fetchChatData();
      // TODO: Error handling
      this.currentChat = chatData;
    }
    this.render();
  }

  disconnectedCallback() {
    document.removeEventListener('chatItemSelected', this.handleChatItemSelected);
    document.removeEventListener('sendMessage', this.sendMessage);
    document.removeEventListener('toggleLike', this.toggleLikeMessage);
    window.removeEventListener('resize', this.handleWindowResize);
    this.backButton?.removeEventListener('click', this.handleBackToChatList);
  }

  /* ------------------------------------------------------------------------ */
  /*      Rendering                                                           */
  /* ------------------------------------------------------------------------ */

  async render() {
    this.innerHTML = this.template() + this.style();

    this.chatListContainer = this.querySelector('#chat-list-container');
    this.chatContainer = this.querySelector('#chat-container');
    this.chatMessagesArea = document.querySelector('chat-message-area');
    this.chatList = this.querySelector('chat-list-component');
    this.backButton = this.querySelector('#back-to-chat-list');

    this.chatList.setData(this.chatListData, this.#state.chatListItemCount, this.#state.user.username);
    this.chatMessagesArea.setData(this.currentChat);

    document.addEventListener('chatItemSelected', this.handleChatItemSelected);
    document.addEventListener('sendMessage', this.sendMessage);
    document.addEventListener('toggleLike', this.toggleLikeMessage);
    window.addEventListener('resize', this.handleWindowResize);
    this.backButton.addEventListener('click', this.handleBackToChatList);

    socketManager.addListener('message', (message) => this.receiveMessage(message));
    socketManager.addListener('like_message', (ids) => this.handleLikedMessage(ids));
    socketManager.addListener('unlike_message', (ids) => this.handleUnlikedMessage(ids));
  }

  async fetchChatList() {
    const response = await apiRequest(
        'GET',
        /* eslint-disable-next-line new-cap */
        API_ENDPOINTS.CHAT_LIST(10, this.#state.currentChatIndex),
        null,
        false,
        true,
    );
    if (response.success) {
      console.log('Chat list response:', response);
      this.chatListData = response.data.items;
      this.#state.chatListItemCount = response.data.count;
      return this.chatListData;
    } else {
      // TODO: Handle error
    }
  }

  async fetchChatData() {
    const response = await apiRequest(
        'PUT',
        /* eslint-disable-next-line new-cap */
        API_ENDPOINTS.CHAT(this.#state.currentChatUsername),
        null,
        false,
        true,
    );
    if (response.success) {
      console.log('Chat data response:', response);
      return response.data;
    } else {
      // TODO: Handle error
    }
  }

  async updateChatList(newMessage) {
    // TODO
    // Update chat list with new message notification
  }

  /* ------------------------------------------------------------------------ */
  /*      Event handlers                                                      */
  /* ------------------------------------------------------------------------ */

  async handleChatItemSelected(event) {
    if (!event.detail.messages) {
      // const chatData = await mockChatMessagesData(event.detail);
      this.#state.currentChatUsername = event.detail;
      const chatData = await this.fetchChatData();
      // TODO: Error handling
      this.currentChat = chatData;
    } else {
      this.currentChat = event.detail;
    }
    this.chatMessagesArea.setData(this.currentChat);

    if (isMobile()) {
      this.chatListContainer.classList.add('d-none');
      this.chatContainer.classList.remove('d-none', 'd-md-block');
    }
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

  sendMessage(event) {
    console.log('Send message event:', event.detail);
    const messageData = {
      action: 'message',
      data: {
        chat_id: this.currentChat.chat_id,
        content: event.detail,
      },
    };
    console.log('Message data:', messageData);
    socketManager.socket.send(JSON.stringify(messageData));
    // TODO: Render temporary message (in gray) to chat message area?
    // But how to match with the server response to remove it after ?
  }

  toggleLikeMessage(event) {
    const messageData = {
      action: event.detail.isLiked ? 'like_message' : 'unlike_message',
      data: {
        chat_id: this.currentChat.chat_id,
        message_id: event.detail.messageId,
      },
    };
    console.log('Like message data:', messageData);
    socketManager.socket.send(JSON.stringify(messageData));
  }

  receiveMessage(message) {
    console.log('New message:', message);
    const newMessage = message;
    // ----- For test --------------------------------
    message.sender = this.currentChat.username;
    // -----------------------------------------------
    if (message.chat_id === this.currentChat.chat_id) {
      this.currentChat.messages.unshift(message);
      // TODO: Append new message instead of updating the whole chat
      this.chatMessagesArea.setData(this.currentChat);
    } else {
      this.updateChatList(message);
    }
  }

  handleLikedMessage(ids) {
    // Find concerned Chat

    // If the message is in the current chat
    // Find concerned message in the Chat
    // Update is_liked field
    // If the message is in the current chat, update the message
  }

  handleUnlikedMessage(ids) {
  }

  /* ------------------------------------------------------------------------ */
  /*     Template & style                                                     */
  /* ------------------------------------------------------------------------ */

  template() {
    return `
    <div class="container-fluid d-flex flex-row flex-grow-1 p-0" id="chat-component-container">
      <div class="chat-list-wrapper col-12 col-md-4">
        <div class="ms-4 my-4" id="chat-list-container">
          <chat-list-component></chat-list-component>
        </div>
      </div>

      <div class="col-12 col-md-8 d-none d-md-block my-4" id="chat-container">
        <div class="d-flex flex-column me-4 h-100">
          <button class="btn btn-secondry mt-2 text-start d-md-none mb-3" id="back-to-chat-list">
            <i class="bi bi-arrow-left"></i>
             Back
          </button>
          <div class="flex-grow-1 overflow-auto me-3">
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
    .chat-list-wrapper {
      background-color: rgba(var(--pm-primary-100-rgb), 0.1);
    }
    #chat-component-container {
      height: calc(100vh - 66px);
      background-color: rgba(var(--pm-primary-100-rgb), 0.2);
    }
    </style>
    `;
  }
}

customElements.define('chat-page', Chat);
