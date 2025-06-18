/**
 * @module Chat
 * @description Provides a dynamic chat interface that integrates chat lists, messaging, and WebSocket communications.
 */

import { router } from '@router';
import { auth } from '@auth';
import { apiRequest, API_ENDPOINTS } from '@api';
import { socketManager } from '@socket';
import { isMobile } from '@utils';
import './components/index.js';

/**
 * @class Chat
 * @extends {HTMLElement}
 * @classdesc Custom Web Component that manages chat functionality, including listing chats, displaying messages,
 *            and handling real-time updates.
 */
export class Chat extends HTMLElement {
  /**
   * Private state of the Chat component.
   * @type {Object}
   * @property {Object|null} loggedInUser - The authenticated user.
   * @property {string} currentChatUsername - The username for the current active chat.
   * @property {Object|null} currentChat - Data of the current active chat.
   */
  #state = {
    loggedInUser: null,
    currentChatUsername: '',
    currentChat: null,
  };

  /**
   * Stores the query parameter used to set the current chat
   * in case the logged-in user starts the chat clicking 'send message' button on Profile page.
   * @type {string}
   */
  #queryParam = '';

  /**
   * Creates an instance of Chat.
   */
  constructor() {
    super();
    this.handleChatItemSelected = this.handleChatItemSelected.bind(this);
    this.sendMessage = this.sendMessage.bind(this);
    this.receiveMessage = this.receiveMessage.bind(this);
    this.handleToggleLikeMessage = this.handleToggleLikeMessage.bind(this);
    this.updateOnlinestatus = this.updateOnlinestatus.bind(this);

    this.handleWindowResize = this.handleWindowResize.bind(this);
    this.handleBackToChatList = this.handleBackToChatList.bind(this);
  }

  /**
   * Invoked when the component is added to the DOM.
   * @async
   * @return {Promise<void>}
   */
  async connectedCallback() {
    this.#state.loggedInUser = auth.getStoredUser();
    const isLoggedIn = this.#state.loggedInUser ? true : false;
    if (!isLoggedIn) {
      router.redirect('/login');
      return;
    }
    // Remove the unread messages badge from the navbar
    document.getElementById('navbar-chat-badge')?.classList.add('d-none');
    this.render();
    this.chatList.setData(null, this.#state.loggedInUser.username, null);
    this.chatMessagesArea.setData(null, this.#state.loggedInUser.username);

    // Fetch data for the chat list component
    this.chatList.querySelector('.chat-loader')?.classList.remove('d-none');
    this.chatMessagesArea.querySelector('.chat-loader')?.classList.remove('d-none');

    console.time('Fetching chat list data');
    const chatListData = await this.fetchChatList();
    console.timeEnd('Fetching chat list data');
    this.chatList.querySelector('.chat-loader')?.classList.add('d-none');
    if (!chatListData) {
      return;
    }

    // Determine initial chat based on available data or query parameter
    if (chatListData.count > 0 && !this.#queryParam) {
      for (let i = 0; i < chatListData.items.length; i++) {
        if (!chatListData.items[i].is_blocked_by_user && chatListData.items[i].last_message) {
          this.#state.currentChatUsername = chatListData.items[i].username;
          chatListData.items[i].unread_messages_count = 0;
          break;
        }
      }
    } else if (this.#queryParam) {
      this.#state.currentChatUsername = this.#queryParam;
    }

    this.chatList.setData(chatListData, this.#state.loggedInUser.username, this.getCurrentChatUsername.bind(this));
    if (chatListData.count === 0 || !this.#state.currentChatUsername) {
      this.chatMessagesArea.querySelector('.chat-loader')?.classList.add('d-none');
      this.chatMessagesArea.querySelector('.no-messages')?.classList.remove('d-none');
    }

    // Fetch and set data for the chat message area component
    let chatData = null;
    if (this.#state.currentChatUsername) {
      chatData = await this.fetchChatData();
      this.chatMessagesArea.querySelector('.chat-loader')?.classList.add('d-none');
      if (!chatData) {
        return;
      }
      if (this.#queryParam && chatData.status === 201) {
        this.chatList.addNewChat(chatData.data);
      } else if (this.#queryParam && chatData.status === 200) {
        this.chatList.restartChat(chatData.data);
      }
      this.#state.currentChat = chatData.data;
      this.chatMessagesArea.setData(this.#state.currentChat, this.#state.loggedInUser.username);
    }
    this.chatMessagesArea.sendToggleLikeEvent = this.sendToggleLikeEvent;
  }

  setQueryParam(param) {
    this.#queryParam = param.get('username');
  }

  disconnectedCallback() {
    document.removeEventListener('chatItemSelected', this.handleChatItemSelected);
    document.removeEventListener('sendMessage', this.sendMessage);
    this.removeEventListener('toggleLikeChatMessage', this.handleToggleLikeMessage);
    document.removeEventListener('newChatMessage', this.receiveMessage);
    document.removeEventListener('toggleLike', this.toggleLikeMessage);
    document.removeEventListener('onlineStatus', this.updateOnlinestatus);
    window.removeEventListener('resize', this.handleWindowResize);
    this.backButton?.removeEventListener('click', this.handleBackToChatList);
  }

  getCurrentChatUsername() {
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
    document.addEventListener('toggleLikeChatMessage', this.handleToggleLikeMessage);
    document.addEventListener('newChatMessage', this.receiveMessage);
    document.addEventListener('onlineStatus', this.updateOnlinestatus);
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
      devLog('Chat list response:', response);
      return response.data;
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
      devLog('Chat data response:', response);
      return { data: response.data, status: response.status };
    } else {
      return null;
    }
  }

  /* ------------------------------------------------------------------------ */
  /*      Event handlers                                                      */
  /* ------------------------------------------------------------------------ */

  async handleChatItemSelected(event) {
    if (!event.detail.messages) {
      this.#state.currentChatUsername = event.detail;
      const chatData = await this.fetchChatData();
      if (!chatData) {
        return;
      }
      this.#state.currentChat = chatData.data;
    } else {
      this.#state.currentChat = event.detail;
    }
    this.chatMessagesArea.setData(this.#state.currentChat, this.#state.loggedInUser.username);

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
    devLog('Sending new message to server. Data:', messageData);
    socketManager.sendMessage('livechat', messageData);
  }

  sendToggleLikeEvent(chatId, messageId, isLiked) {
    const messageData = {
      action: isLiked ? 'like_message' : 'unlike_message',
      data: {
        chat_id: chatId,
        id: messageId,
      },
    };
    socketManager.sendMessage('livechat', messageData);
  }

  async receiveMessage(event) {
    devLog('New message received:', event.detail);
    if (this.#state.currentChat && event.detail.chat_id === this.#state.currentChat.chat_id) {
      this.chatMessagesArea.renderNewMessage(event.detail);
    } else if (!this.#state.currentChat && event.detail.sender !== this.#state.loggedInUser.username) {
      this.#state.currentChatUsername = event.detail.sender;
      const chatData = await this.fetchChatData();
      if (!chatData) {
        return;
      }
      this.#state.currentChat = chatData.data;
      this.chatMessagesArea.setData(this.#state.currentChat, this.#state.loggedInUser.username);
    }
    await this.chatList.updateListWithIncomingMessage(event.detail);
  }

  handleToggleLikeMessage(event) {
    const data = event.detail.data;
    if (data.chat_id !== this.#state.currentChat.chat_id) {
      return;
    }
    const component = document.getElementById(data.id);
    if (component) {
      if (data.is_liked) {
        devLog('Message is liked:', component);
        component.classList.add('liked');
      } else {
        devLog('Message is unliked:', component);
        component.classList.remove('liked');
      }
    }
  }

  updateOnlinestatus(event) {
    if (event.detail.data.username.toLowerCase() === this.#state.currentChatUsername.toLowerCase()) {
      this.chatMessagesArea.updateOnlineStatus(event.detail);
    }
    this.chatList.updateOnlineStatus(event.detail);
  }

  /* ------------------------------------------------------------------------ */
  /*     Template & style                                                     */
  /* ------------------------------------------------------------------------ */

  template() {
    return `
    <div class="container-fluid d-flex flex-row flex-grow-1 p-0" id="chat-component-container">
      <invite-game-modal></invite-game-modal>
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
    </style>`;
  }
}

customElements.define('chat-page', Chat);
