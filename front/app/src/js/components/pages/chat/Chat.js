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
  };

  constructor() {
    super();
    this.chatListData = [];
    this.currentChat = null;

    this.handleChatItemSelected = this.handleChatItemSelected.bind(this);
    this.sendMessage = this.sendMessage.bind(this);
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
      // ----- Temporary mock data ----------------------------------------------
      const chatData = await mockChatMessagesData(this.chatListData[0].username);
      // ------------------------------------------------------------------------
      // PUT /api/chats/username
      this.currentChat = chatData;
      this.chatListData[0].unread_messages_count = 0;
    }
    this.render();
  }

  disconnectedCallback() {
    document.removeEventListener('chatItemSelected', this.handleChatItemSelected);
    document.removeEventListener('sendMessage', this.sendMessage);
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
    window.addEventListener('resize', this.handleWindowResize);
    this.backButton.addEventListener('click', this.handleBackToChatList);

    document.addEventListener('sendMessage', this.sendMessage);
    socketManager.addListener('message', (message) => this.receiveMessage(message));
    socketManager.addListener('like_message', (ids) => this.handleLikedMessage);
    socketManager.addListener('unlike_message', this.handleUnlikedMessage);
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

  async updateChatList(newMessage) {
    // TODO
    // Update chat list with new message notification
  }

  /* ------------------------------------------------------------------------ */
  /*      Event listeners                                                     */
  /* ------------------------------------------------------------------------ */

  async handleChatItemSelected(event) {
    if (!event.detail.messages) {
      // TODO: Replace by apiRequest
      const chatData = await mockChatMessagesData(event.detail);
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

  /* ------------------------------------------------------------------------ */
  /*      Action handlers                                                     */
  /* ------------------------------------------------------------------------ */

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
    // But how to remove it after receiving the actual message?
  }

  // TODO: Add event listner (custom event from chat messages area
  toggleLikeMessage(event) {
    const messageData = {
      action: event.detail.isLiked ? 'like_message' : 'unlike_message',
      data: {
        chat_id: this.currentChat.chat_id,
        message_id: event.detail.messageId,
      },
    };
    socketManager.socket.send(JSON.stringify(messageData));
  }

  receiveMessage(message) {
    console.log('New message:', message);
    const newMessage = message;
    // ----- For test --------------------------------
    newMessage.sender = this.currentChat.username;
    // -----------------------------------------------
    if (newMessage.sender === this.currentChat.username) {
      this.currentChat.messages.unshift(newMessage);
      // TODO: Append new message instead of updating the whole chat
      this.chatMessagesArea.setData(this.currentChat);
    }
    this.updateChatList(newMessage);
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
