/**
 * @file ChatMessageArea Component
 * @description Render the chat messages area, including the header, messages, and input to send messages.
 *              It handles user interactions such as navigating to a profile, blocking/unblocking users,
 *              loading more messages, and toggling likes on messages.
 * @module ChatMessageArea
 */
import { Tooltip } from 'bootstrap';
import defaultAvatar from '/img/default_avatar.png?url';
import { router } from '@router';
import { apiRequest, API_ENDPOINTS } from '@api';
import { socketManager } from '@socket';
import {
  showAlertMessageForDuration,
  ALERT_TYPE,
  showToastNotification,
  TOAST_TYPES,
  getRelativeDateAndTime,
  loader,
} from '@utils';

/**
 * @class ChatMessageArea
 * @extends {HTMLElement}
 * @classdesc Custom web component for displaying and managing chat messages.
 */
export class ChatMessageArea extends HTMLElement {
  /**
   * Private state for the ChatMessageArea component.
   * @type {Object}
   * @property {string} loggedInUsername - The username of the logged-in user.
   * @property {Object|null} user - Data of the chat recipient.
   * @property {Object|null} data - Chat data including messages and user details.
   * @property {number} renderedMessagesCount
   * @property {number} totalMessagesCount - Total count of messages available in database.
   */
  #state = {
    loggedInUsername: '',
    user: null,
    data: null,
    renderedMessagesCount: 0,
    totalMessagesCount: 0,
    unreadMessageIds: [],
  };

  #sendToggleLikeEvent = null;

  constructor() {
    super();

    // Initialize components
    this.header = null;
    this.headerAvatar = null;
    this.headerNickname = null;
    this.headerUsername = null;
    this.headerOnlineStatusIndicator = null;
    this.headerOnlineStatus = null;
    this.invitePlayButton = null;
    this.gameInvitationModal = null;
    this.blockButoon = null;
    this.chatMessages = null;

    // Bind methods to the component instance
    this.navigateToProfile = this.navigateToProfile.bind(this);
    this.openGameInvitationModal = this.openGameInvitationModal.bind(this);
    this.blockUser = this.blockUser.bind(this);
    this.unblockUser = this.unblockUser.bind(this);
    this.loadMoreMessages = this.loadMoreMessages.bind(this);
    this.toggleLikeMessage = this.toggleLikeMessage.bind(this);

    this.chatListComponent = document.querySelector('chat-list-component');
  }

  /**
   * Set the chat data and logged-in username, then renders the component.
   * @param {Object} data - Chat data including messages and user details.
   * @param {string} loggedInUsername - The username of the logged-in user.
   */
  setData(data, loggedInUsername) {
    if (data && data.is_blocked_by_user) {
      const message = 'This conversation is temporaly unavailable.';
      showAlertMessageForDuration(ALERT_TYPE.ERROR, message);
      const ChatPage = document.querySelector('chat-page');
      ChatPage?.connectedCallback();
      return;
    }
    this.#state.renderedMessagesCount = 0;
    this.#state.data = data;
    this.#state.loggedInUsername = loggedInUsername;
    this.render();
    log.info('ChatMessageArea data:', this.#state.data);
  }

  set sendToggleLikeEvent(callback) {
    this.#sendToggleLikeEvent = callback;
  }

  disconnectedCallback() {
    const tooltipElements = this.querySelectorAll('.message');
    tooltipElements.forEach((element) => {
      const tooltipInstance = Tooltip.getInstance(element);
      if (tooltipInstance) {
        tooltipInstance.hide();
        tooltipInstance.dispose();
      }
    });
    this.header?.removeEventListener('click', this.navigateToProfile);
    if (this.#state.data) {
      this.#state.data.is_blocked_user
        ? this.blockButoon?.removeEventListener('click', this.unblockUser)
        : (this.invitePlayButton?.removeEventListener('click', this.openGameInvitationModal),
          this.blockButoon?.removeEventListener('click', this.blockUser));
    }
    this.chatMessages?.removeEventListener('scrollend', this.loadMoreMessages);
    this.chatMessages?.removeEventListener('click', this.toggleLikeMessage);
  }

  /* ------------------------------------------------------------------------ */
  /*     Render                                                               */
  /* ------------------------------------------------------------------------ */
  render() {
    this.chatMessages?.removeEventListener('scrollend', this.loadMoreMessages);
    this.chatMessages?.removeEventListener('click', this.toggleLikeMessage);

    this.innerHTML = this.style() + this.template();
    this.messageInput = this.querySelector('#chat-message-input-wrapper');
    this.loader = this.querySelector('.chat-loader');
    this.loader.innerHTML = loader();

    if (!this.#state.data) {
      this.messageInput.classList.add('d-none');
      return;
    }

    // Select components from the template.
    this.header = this.querySelector('#chat-header');
    this.headerAvatar = this.querySelector('#chat-header-avatar');
    this.headerNickname = this.querySelector('#chat-header-nickname');
    this.headerUsername = this.querySelector('#chat-header-username');
    this.headerOnlineStatusIndicator = this.querySelector('#chat-header-online-status-indicator');
    this.headerOnlineStatus = this.querySelector('#chat-header-online-status');
    this.invitePlayButton = this.querySelector('#chat-invite-play-button');
    this.gameInvitationModal = document.querySelector('invite-game-modal');
    this.blockButoon = this.querySelector('#chat-block-user-button');
    this.chatMessages = this.querySelector('#chat-messages');

    // Set header information and avatar.
    this.#state.data.avatar
      ? (this.headerAvatar.src = this.#state.data.avatar)
      : (this.headerAvatar.src = defaultAvatar);
    this.headerAvatar.classList.remove('d-none');
    this.headerNickname.textContent = this.#state.data.nickname;
    this.headerUsername.textContent = `@${this.#state.data.username}`;
    this.headerOnlineStatusIndicator.classList.remove('d-none');
    this.headerOnlineStatusIndicator.classList.toggle('online', this.#state.data.is_online);
    this.headerOnlineStatus.textContent = this.#state.data.is_online ? 'online' : 'offline';
    this.header.addEventListener('click', this.navigateToProfile);

    // Render messages
    this.chatMessages.innerHTML = '';
    if (this.#state.data.messages.length > 0) {
      this.renderMessages();
      // Scroll to the bottom of the chat messages
      requestAnimationFrame(() => {
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
      });
    }
    this.chatMessages.addEventListener('scrollend', this.loadMoreMessages);
    this.chatMessages.addEventListener('click', this.toggleLikeMessage);

    // Toggle input and block button based on block status.
    if (this.#state.data.is_blocked_user) {
      this.messageInput.classList.add('d-none');
      this.blockButoon.textContent = 'Unblock user';
      this.blockButoon.addEventListener('click', this.unblockUser);
    } else {
      this.messageInput.classList.remove('d-none');
      this.invitePlayButton.classList.remove('d-none');
      this.blockButoon.textContent = 'Block user';
      this.invitePlayButton.addEventListener('click', this.openGameInvitationModal);
      this.blockButoon.addEventListener('click', this.blockUser);
    }
  }

  renderMessages() {
    if (this.#state.data.is_blocked_user) {
      const blockedUserContent = this.querySelector('.blocked-user');
      blockedUserContent?.classList.remove('d-none');
      return;
    }
    const currentMessageCount = this.#state.data.messages.length;
    for (let i = this.#state.renderedMessagesCount; i < currentMessageCount; i++) {
      const message = this.messageItem(this.#state.data.messages[i]);
      this.chatMessages.prepend(message);
    }
    this.markMessagesAsRead();
  }

  async loadMoreMessages() {
    if (this.chatMessages.scrollTop === 0) {
      if (this.#state.renderedMessagesCount < 30) {
        return;
      }
      if (this.#state.totalMessagesCount === 0 || this.#state.renderedMessagesCount < this.#state.totalMessagesCount) {
        const previousHeight = this.chatMessages.scrollHeight;

        const response = await apiRequest(
          'GET',
          /* eslint-disable-next-line new-cap */
          API_ENDPOINTS.CHAT_MESSAGES(this.#state.data.username, 30, this.#state.renderedMessagesCount),
          null,
          false,
          true,
        );
        if (response.success) {
          this.#state.data.messages.push(...response.data.items);
          this.#state.totalMessagesCount = response.data.count;
          this.renderMessages();
        } else {
          showToastNotification('Failed to load more messages.', TOAST_TYPES.ERROR);
        }
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight - previousHeight;
      }
    }
  }

  renderPendingMessage(data) {
    const messageElement = document.createElement('div');
    messageElement.innerHTML = this.pendingMessageTemplate();
    messageElement.classList.add(
      'right-align-message',
      'd-flex',
      'flex-row',
      'justify-content-end',
      'align-items-center',
    );
    const messageContent = messageElement.querySelector('.bubble');
    messageContent.id = data.timestamp;
    messageContent.querySelector('.message-content').textContent = data.content;
    messageElement.classList.add('animateIn');
    this.chatMessages.appendChild(messageElement);
    this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    messageElement.addEventListener(
      'animationend',
      () => {
        messageElement.classList.remove('animateIn');
      },
      { once: true },
    );
  }

  updateMessageStatus(data) {
    const messageContent = document.getElementById(data.timestamp);
    if (!messageContent) {
      return false;
    }
    const message = messageContent.querySelector('.message-content');
    if (!message || message.textContent !== data.content) {
      return false;
    }
    messageContent.id = data.id;
    messageContent.classList.add('fade-in-animation-half');
    messageContent.addEventListener(
      'animationend',
      () => {
        messageContent.classList.remove('fade-in-animation-half');
        messageContent.classList.remove('pending-message');
      },
      { once: true },
    );
    return true;
  }

  renderNewMessage(data) {
    const message = {
      content: data.content,
      date: data.date,
      sender: data.sender,
      is_read: true,
      is_liked: false,
      id: data.id,
    };
    this.#state.data.messages.unshift(message);
    if (this.updateMessageStatus(data)) {
      return;
    }
    const messageElement = this.messageItem(message);
    this.markMessagesAsRead();
    messageElement.classList.add('animateIn');
    this.chatMessages.appendChild(messageElement);
    this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    messageElement.addEventListener(
      'animationend',
      () => {
        messageElement.classList.remove('animateIn');
      },
      { once: true },
    );
  }

  /**
   * Create a DOM element for a single message.
   * @param {Object} message - The message data.
   * @return {HTMLElement} The message element.
   */
  messageItem(message) {
    const messageElement = document.createElement('div');
    messageElement.innerHTML = this.messageTemplate();
    const messageContent = messageElement.querySelector('.bubble');
    messageContent.id = message.id;

    if (message.sender === this.#state.loggedInUsername) {
      messageElement.classList.add(
        'right-align-message',
        'd-flex',
        'flex-row',
        'justify-content-end',
        'align-items-center',
      );
      messageContent.classList.add('ms-5');
      messageElement.querySelector('.chat-message-avatar').remove();
    } else {
      messageElement.classList.add(
        'left-align-message',
        'd-flex',
        'flex-row',
        'justify-content-start',
        'align-items-center',
        'gap-3',
      );
      messageContent.classList.add('me-5');
      messageElement.querySelector('.chat-message-avatar').src = this.#state.data.avatar;
      messageContent.classList.add('received-message');
      if (!message.is_read) {
        this.#state.unreadMessageIds.push(message.id);
      }
    }
    messageElement.querySelector('.message-content').textContent = message.content;
    message.is_liked ? messageContent.classList.add('liked') : messageContent.classList.remove('liked');

    messageElement.querySelector('.message').setAttribute('title', getRelativeDateAndTime(message.date));
    const tooltip = new Tooltip(messageElement.querySelector('.message'));
    tooltip.update();
    this.#state.renderedMessagesCount++;
    return messageElement;
  }

  markMessagesAsRead() {
    if (this.#state.unreadMessageIds.length === 0) {
      return;
    }
    this.#state.unreadMessageIds.forEach((messageId, idx) => {
      setTimeout(() => {
        const readMessage = {
          action: 'read_message',
          data: {
            chat_id: this.#state.data.chat_id,
            id: messageId,
          },
        };
        socketManager.sendMessage('livechat', readMessage);
        this.#state.unreadMessageIds.shift();
      }, 100 * idx);
    });
  }

  /* ------------------------------------------------------------------------ */
  /*     Event handlers                                                       */
  /* ------------------------------------------------------------------------ */
  navigateToProfile() {
    router.navigate(`/profile/${this.#state.data.username}`);
  }

  openGameInvitationModal() {
    const user = {
      username: this.#state.data.username,
      nickname: this.#state.data.nickname,
      avatar: this.#state.data.avatar,
    };
    this.gameInvitationModal.showModal(user);
  }

  /**
   * Block the current chat user by sending an API request.
   * Update the UI accordingly.
   * @async
   * @return {Promise<void>}
   */
  async blockUser() {
    const request = { username: this.#state.data.username };
    const response = await apiRequest(
      'POST',
      /* eslint-disable-next-line new-cap */
      API_ENDPOINTS.USER_BLOCKED_USERS(this.#state.loggedInUsername),
      request,
      false,
      true,
    );
    const successMessage = 'User blocked successfully.';
    const errorMessage = 'Failed to block user. Please try again later.';
    if (response.success) {
      showAlertMessageForDuration(ALERT_TYPE.SUCCESS, successMessage, 3000);
      this.#state.data.is_blocked_user = true;
      this.render();
      const chatListItemComponent = document.getElementById(`chat-item-${this.#state.data.username}`);
      chatListItemComponent.classList.add('blocked');
      chatListItemComponent.querySelector('.chat-list-item-last-message').textContent = 'You have blocked this user';
      chatListItemComponent.querySelector('.chat-list-item-last-message-time').textContent = '';
      chatListItemComponent.querySelector('.chat-list-item-unread-message').classList.add('d-none');
    } else {
      showAlertMessageForDuration(ALERT_TYPE.ERROR, errorMessage, 3000);
    }
  }

  /**
   * Unblock the current chat user by sending an API request.
   * Update the chat list and this component.
   * @async
   * @return {Promise<void>}
   */
  async unblockUser() {
    const response = await apiRequest(
      'DELETE',
      /* eslint-disable-next-line new-cap */
      API_ENDPOINTS.USER_UNBLOCK_USER(this.#state.loggedInUsername, this.#state.data.username),
      null,
      false,
      true,
    );
    const successMessage = 'User unblocked successfully.';
    const errorMessage = 'Failed to unblock user. Please try again later.';
    if (response.success) {
      showAlertMessageForDuration(ALERT_TYPE.SUCCESS, successMessage, 3000);
      this.#state.data.is_blocked_user = false;
      this.#state.renderedMessagesCount = 0;

      const chatListItem = this.chatListComponent.querySelector(`#chat-item-${this.#state.data.username}`);
      if (chatListItem) {
        const chatItemElement = chatListItem.parentElement;
        chatItemElement.render();
        const updatedItem = chatItemElement.querySelector('.chat-list-item');
        updatedItem.classList.remove('blocked');
        updatedItem.classList.add('active');
      } else {
        this.chatListComponent.refreshList();
      }
      this.render();
    } else {
      showAlertMessageForDuration(ALERT_TYPE.ERROR, errorMessage, 3000);
    }
  }

  /**
   * Toggle the like status of a message.
   * @param {Event} event - The click event on the message bubble.
   * @return {void}
   */
  toggleLikeMessage(event) {
    const messageBubble = event.target.closest('.bubble');
    if (!messageBubble || !messageBubble.classList.contains('received-message')) {
      return;
    }
    const messageId = messageBubble.getAttribute('id');
    const messageData = this.#state.data.messages.find((message) => message.id === messageId);
    messageData.is_liked = !messageData.is_liked;
    this.#sendToggleLikeEvent(this.#state.data.chat_id, messageId, messageData.is_liked);
  }

  /**
   * Update the online status of the user in the chat header.
   * @param {Object} data - The data containing the online status.
   * @property {boolean} data.online - The online status of the user.
   * @return {void}
   * */
  updateOnlineStatus(data) {
    this.headerOnlineStatusIndicator.classList.toggle('online', data.online);
    this.headerOnlineStatus.textContent = data.online ? 'online' : 'offline';
  }

  /* ------------------------------------------------------------------------ */
  /*     Template & style                                                     */
  /* ------------------------------------------------------------------------ */
  template() {
    return `
    <div class="d-flex flex-column h-100">
      <!-- Header -->
      <div class="d-flex flex-row justify-content-between align-items-center border-bottom ps-4 py-3 gap-3 sticky-top">
  
        <div class="d-flex flex-row" id="chat-header">
          <img class="avatar-m rounded-circle me-3 d-none" alt="User" id="chat-header-avatar"/>

          <div class="d-flex flex-column text-start gap-1 flex-grow-1">
            <div class="d-flex flex-row flex-grow-1 flex-wrap flex-shrink-1" id="chat-header-names">
              <h4 class="mb-0 me-3" id="chat-header-nickname"></h4>
              <p class="mb-0 fs-6" id="chat-header-username"></p>
            </div>
            <div class="d-flex flex-row align-items-center gap-2 flex-shrink-0">
              <span class="online-status d-none" id="chat-header-online-status-indicator"></span>
              <div id="chat-header-online-status"></div>
            </div>
          </div>
        </div>

        <div class="align-self-end flex-shrink-0">
          <button class="btn d-none" id="chat-invite-play-button">Invite to play</button>
          <button class="btn" id="chat-block-user-button"></button>
        </div>
      </div>

      <!-- Messages -->
      <div class="chat-loader d-flex text-center justify-content-center align-items-center ms-4 mt-5 d-none"></div>
      <div class="no-messages d-flex flex-column justify-content-center align-items-center mt-5 d-none">
        <p class="m-0">Every great partnership starts with a howdy.</p>
        <p class="m-0">Don't be shy now — send your first message.</p>
      </div>
      <div class="blocked-user d-flex flex-column justify-content-center align-items-center mt-5 d-none">
        <p class="m-0">You have blocked this user. Please unblock to send messages.</p>
      </div>
      <div class="flex-grow-1 overflow-auto ps-4 pe-3 pt-4 pb-3" id="chat-messages" lang="en"></div>

      <!-- Input -->
      <div id="chat-message-input-wrapper">
        <chat-message-input></chat-message-input>
      </div>
    </div>
	  `;
  }

  style() {
    return `
	  <style>
      #chat-header-names {
      overflow-wrap: anywhere;
      hyphens: auto;
      }
      #chat-messages {
        min-height: 0;
      }
      .message {
        overflow-wrap: anywhere;
        hyphens: auto;
      }
      .animateIn {
        animation: animateIn 0.4s ease forwards;
      }
      @keyframes animateIn {
        0% {
          opacity: 0;
          transform: scale(0) translateY(24px);
        }
        100% {
          opacity: 1;
          transform: scale(1) translateY(0);
        }
      }
      .left-align-message {
        padding-right: 32px;
        margin-bottom: 24px;
        .message-time {
          margin-left: 8px;
          margin-bottom: 4px;
        }
        .bubble:hover {
          .bi-heart-fill {
            opacity: 0.5;
          }
        }
      }
      .right-align-message {
        margin-left: 80px;
        margin-bottom: 24px;
        .message-time {
          margin-left: 56px;
          margin-bottom: 4px;
        }
      }
      .bubble {
        position: relative;
        display: inline-block;
        padding: 12px 20px 12px 16px;
        border-radius: 16px;
        background-color: var(--pm-gray-100);
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        color: var(--pm-gray-700);
      }
      .bubble i {
        display: block;
      } 
      .right-align-message .bubble {
        background-color: var(--pm-primary-600);
        color: var(--pm-gray-100);
        i {
          color: var(--pm-gray-400);
          opacity: 0;
        }
      }
      .bi-heart-fill {
        position: absolute;
        bottom: -20px;
        right: 6px;
        color: var(--pm-gray-400);
        opacity: 0;
      }
      .bubble.liked .message-liked {
        visibility: visible;
        opacity: 1;
        color: var(--pm-red-400);
        transition-delay: 0s;
        transform: scale(1);
        animation: pop 0.6s ease;
      }
      @keyframes pop {
        0%   { transform: scale(1); }
        30%  { transform: scale(1.3); }
        50%  { transform: scale(1); }
        70%  { transform: scale(1.4); }
        100% { transform: scale(1); }
      }
      .bubble.unliked .message-liked {
        color: var(--pm-gray-400);
        animation: disappear 0.6s ease forwards;
      }
      @keyframes disappear {
        0% { 
          transform: scale(1);
          opacity: 1;
        }
        100% {
          transform: scale(1);
          opacity: 0;
        }
      }
      .message-time {
        font-size: 12px;
      }
      .pending-message {
        opacity: 0.4
      }
	  </style>
    `;
  }

  messageTemplate() {
    return `
    <img class="chat-message-avatar avatar-xs rounded-circle" alt="User" />
    <div class="message" data-bs-toggle="tooltip">
      <div class="bubble">
        <div class="message-content"></div>
        <i class="message-liked bi bi-heart-fill h5"></i>
      </div>
    </div>
    `;
  }

  pendingMessageTemplate() {
    return `
    <div class="message" data-bs-toggle="tooltip">
      <div class="pending-message bubble ms-5">
        <div class="message-content"></div>
        <i class="message-liked bi bi-heart-fill h5"></i>
      </div>
    </div>
  `;
  }
}

customElements.define('chat-message-area', ChatMessageArea);
