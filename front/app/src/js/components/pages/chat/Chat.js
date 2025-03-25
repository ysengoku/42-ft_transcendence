import { router } from '@router';
import { auth } from '@auth';
import { apiRequest, API_ENDPOINTS } from '@api';
import { socketManager } from '@socket';
import { isMobile } from '@utils';
import './components/index.js';

export class Chat extends HTMLElement {
  #state = {
    loggedInUser: null,
    currentChatUsername: '',
    currentChat: null,
  };

  constructor() {
    super();

    this.handleChatItemSelected = this.handleChatItemSelected.bind(this);
    this.sendMessage = this.sendMessage.bind(this);
    this.receiveMessage = this.receiveMessage.bind(this);
    this.handleWindowResize = this.handleWindowResize.bind(this);
    this.handleBackToChatList = this.handleBackToChatList.bind(this);
  }

  async connectedCallback() {
    this.#state.loggedInUser = auth.getStoredUser();
    const isLoggedIn = this.#state.loggedInUser ? true : false;
    if (!isLoggedIn) {
      router.navigate('/login');
      return;
    }
    const chatListData = await this.fetchChatList();
    if (!chatListData) {
      return;
    }

    if (chatListData.count > 0) {
      this.#state.currentChatUsername = chatListData.items[0].username;
      chatListData.items[0].unread_messages_count = 0;
      const chatData = await this.fetchChatData();
      if (!chatData) {
        return;
      }
      this.#state.currentChat = chatData;
    }
    this.render();
    this.chatList.setData(chatListData, this.#state.loggedInUser.username, this.getCurrentChatUsername.bind(this));
    this.chatMessagesArea.setData(this.#state.currentChat);
    this.chatMessagesArea.sendToggleLikeEvent = this.sendToggleLikeEvent;
  }

  disconnectedCallback() {
    document.removeEventListener('chatItemSelected', this.handleChatItemSelected);
    document.removeEventListener('sendMessage', this.sendMessage);
    // document.removeEventListener('newChatMessage', this.receiveMessage);
    document.removeEventListener('toggleLike', this.toggleLikeMessage);
    window.removeEventListener('resize', this.handleWindowResize);
    this.backButton?.removeEventListener('click', this.handleBackToChatList);
  }

  getCurrentChatUsername() {
    console.log('Current chat username:', this.#state.currentChatUsername);
    return this.#state.currentChatUsername;
  }

  /* ------------------------------------------------------------------------ */
  /*      Rendering                                                           */
  /* ------------------------------------------------------------------------ */

  async render() {
    this.innerHTML = this.template() + this.style();

    this.chatList = this.querySelector('chat-list-component');
    this.chatMessagesArea = document.querySelector('chat-message-area');

    this.chatListContainer = this.querySelector('#chat-list-container');
    this.chatContainer = this.querySelector('#chat-container');
    this.backButton = this.querySelector('#back-to-chat-list');

    document.addEventListener('chatItemSelected', this.handleChatItemSelected);
    document.addEventListener('sendMessage', this.sendMessage);
    document.addEventListener('newChatMessage', this.receiveMessage);
    window.addEventListener('resize', this.handleWindowResize);
    this.backButton.addEventListener('click', this.handleBackToChatList);
  }

  async fetchChatList(offset = 0) {
    const response = await apiRequest(
        'GET',
        /* eslint-disable-next-line new-cap */
        API_ENDPOINTS.CHAT_LIST(10, offset),
        null,
        false,
        true,
    );
    if (response.success) {
      console.log('Chat list response:', response);
      return response.data;
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

  /* ------------------------------------------------------------------------ */
  /*      Event handlers                                                      */
  /* ------------------------------------------------------------------------ */

  async handleChatItemSelected(event) {
    console.log('Chat item selected:', event.detail);
    if (!event.detail.messages) {
      this.#state.currentChatUsername = event.detail;
      const chatData = await this.fetchChatData();
      // TODO: Error handling
      this.#state.currentChat = chatData;
    } else {
      this.#state.currentChat = event.detail;
    }
    this.chatMessagesArea.setData(this.#state.currentChat);

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
    const messageData = {
      action: 'new_message',
      data: {
        chat_id: this.#state.currentChat.chat_id,
        content: event.detail,
      },
    };
    console.log('Sending new message to server. Data:', messageData);
    socketManager.socket.send(JSON.stringify(messageData));
    // TODO: Render temporary message (in gray) to chat message area?
    // But how to match with the server response to remove it after ?
  }

  sendToggleLikeEvent(chatId, messageId, isLiked) {
    const messageData = {
      action: isLiked ? 'like_message' : 'unlike_message',
      data: {
        chat_id: chatId,
        id: messageId,
      },
    };
    if (socketManager.socket.readyState === WebSocket.OPEN) {
      console.log('Sending like/unlike message action to server. Data:', messageData);
      socketManager.socket.send(JSON.stringify(messageData));
    } else {
      console.error('WebSocket is not open:', socketManager.socket.readyState);
    }
  }

  async receiveMessage(event) {
    console.log('New message received:', event.detail);
    // debugger;
    if (event.detail.chat_id === this.#state.currentChat.chat_id) {
      this.chatMessagesArea.renderNewMessage(event.detail);
    } else {
      await this.chatList.updateListWithIncomingMessage(event.detail);
    }
  }

  handleLikedMessage(data) {
    if (data.chat_id !== this.#state.currentChat.chat_id) {
      return;
    }

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
      <div class="chat-list-wrapper col-12 col-md-4" id="chat-list-container">
   
          <chat-list-component></chat-list-component>
     
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
      background-color: rgba(var(--bs-body-bg-rgb), 0.1);
    }
    #chat-component-container {
      height: calc(100vh - 66px);
      background-color: rgba(var(--bs-body-bg-rgb), 0.2);
    }
    </style>
    `;
  }
}

customElements.define('chat-page', Chat);
