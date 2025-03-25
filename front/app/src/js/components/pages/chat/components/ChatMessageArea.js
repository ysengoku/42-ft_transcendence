import defaultAvatar from '/img/default_avatar.png?url';
import { router } from '@router';
import { auth } from '@auth';
import { apiRequest, API_ENDPOINTS } from '@api';
import { socketManager } from '@socket';
import { showAlertMessageForDuration, ALERT_TYPE } from '@utils';
import { getRelativeDateAndTime } from '@utils';

export class ChatMessageArea extends HTMLElement {
  #state = {
    user: null,
    data: null,
    renderedMessagesCount: 0,
    totalMessagesCount: 0,
  };

  #sendToggleLikeEvent = null;

  constructor() {
    super();
    this.navigateToProfile = this.navigateToProfile.bind(this);
    this.blockUser = this.blockUser.bind(this);
    this.loadMoreMessages = this.loadMoreMessages.bind(this);
    this.toggleLikeMessage = this.toggleLikeMessage.bind(this);
  }

  setData(data) {
    if (this.#state.user === null) {
      this.#state.user = auth.getStoredUser();
    }
    if (!data) {
      return;
    }
    this.#state.renderedMessagesCount = 0;
    this.#state.data = data;
    console.log('ChatMessageArea data:', this.#state.data);
    this.render();
  }

  set sendToggleLikeEvent(callback) {
    this.#sendToggleLikeEvent = callback;
  }

  disconnectedCallback() {
    this.header?.removeEventListener('click', this.navigateToProfile);
    this.blockButoon?.removeEventListener('click', this.blockUser);
    this.chatMessages?.removeEventListener('scrollend', this.loadMoreMessages);
    this.#state.data.messages.forEach = (message, index) => {
      message.querySelector('.bubble')?.removeEventListener('click', this.toggleLikeMessage(index));
    };
  }

  /* ------------------------------------------------------------------------ */
  /*     Render                                                               */
  /* ------------------------------------------------------------------------ */

  render() {
    this.innerHTML = this.template() + this.style();

    this.header = this.querySelector('#chat-header');
    this.headerAvatar = this.querySelector('#chat-header-avatar');
    this.headerNickname = this.querySelector('#chat-header-nickname');
    this.headerUsername = this.querySelector('#chat-header-username');
    this.headerOnlineStatusIndicator = this.querySelector('#chat-header-online-status-indicator');
    this.headerOnlineStatus = this.querySelector('#chat-header-online-status');
    this.blockButoon = this.querySelector('#chat-block-user-button');
    this.chatMessages = this.querySelector('#chat-messages');

    this.#state.data.avatar ? this.headerAvatar.src = this.#state.data.avatar : this.headerAvatar.src = defaultAvatar;
    this.headerNickname.textContent = this.#state.data.nickname;
    this.headerUsername.textContent = `@${this.#state.data.username}`;
    this.headerOnlineStatusIndicator.classList.toggle('online', this.#state.data.is_online);
    this.headerOnlineStatus.textContent = this.#state.data.is_online ? 'online' : 'offline';

    this.chatMessages.innerHTML = '';
    if (this.#state.data.messages.length > 0) {
      this.renderMessages();
      this.chatMessages.scrollTop = this.chatMessages.scrollHeight; // Scroll to the bottom of the chat messages
      this.chatMessages.addEventListener('scrollend', this.loadMoreMessages);
    }

    this.header.addEventListener('click', this.navigateToProfile);
    this.blockButoon.addEventListener('click', this.blockUser);
  }

  // TODO: Need to update (don't use index, should take messages array as argument)
  renderMessages() {
    const currentMessageCount = this.#state.data.messages.length;
    for (let i = this.#state.renderedMessagesCount; i < currentMessageCount; i++) {
      const message = this.messageItem(this.#state.data.messages[i]);
      this.chatMessages.prepend(message);
    }
  }

  async loadMoreMessages() {
    if (this.chatMessages.scrollTop === 0) {
      if (this.#state.renderedMessagesCount < 30) {
        return;
      }
      if (this.#state.totalMessagesCount === 0 ||
        this.#state.renderedMessagesCount < this.#state.totalMessagesCount) {
        const previousHeight = this.chatMessages.scrollHeight;

        const response = await apiRequest(
            'GET',
            /* eslint-disable-next-line new-cap */
            API_ENDPOINTS.CHAT_MESSAGES(this.#state.data.username, 30, this.#state.renderedMessagesCount),
            null,
            false,
            true);
        if (response.success) {
          this.#state.data.messages.push(...response.data.items);
          this.#state.totalMessagesCount = response.data.count;
          this.renderMessages();
        } else {
          // TODO: Handle error
        }
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight - previousHeight;
      }
    }
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
    const messageElement = this.messageItem(message);
    this.chatMessages.prepend(messageElement);
    this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
  }

  messageItem(message) {
    const messageElement = document.createElement('div');
    messageElement.innerHTML = this.messageTemplate();
    const messageContent = messageElement.querySelector('.bubble');
    messageContent.setAttribute('message-id', message.id);

    if (message.sender === this.#state.data.username) {
      messageElement.classList.add(
          'left-align-message', 'd-flex', 'flex-row', 'justify-content-start',
          'align-items-center', 'gap-3',
      );
      messageContent.classList.add('me-5');
      messageElement.querySelector('.chat-message-avatar').src = this.#state.data.avatar;
      messageElement.querySelector('.message-content').textContent = message.content;
      messageElement.querySelector('.message-liked').innerHTML = message.liked ?
        '<i class="bi bi-heart-fill h5"></i>' : '';
      if (!message.is_read) {
        const readMessage = {
          action: 'read_message',
          data: {
            chat_id: this.#state.data.chat_id,
            id: message.id,
          },
        };
        socketManager.socket.send(JSON.stringify(readMessage));
      }
      messageElement.addEventListener('click', this.toggleLikeMessage);
    } else {
      messageElement.classList.add('right-align-message', 'd-flex', 'flex-row', 'justify-content-end',
          'align-items-center');
      messageContent.classList.add('ms-5');
      messageElement.querySelector('.chat-message-avatar').remove();
      messageElement.querySelector('.message-content').textContent = message.content;
      messageElement.querySelector('.message-liked').innerHTML = message.liked ?
        '<i class="bi bi-heart-fill h5"></i>' : '';
    }
    messageElement.querySelector('.message').setAttribute('title', getRelativeDateAndTime(message.date));
    const tooltip = new bootstrap.Tooltip(messageElement.querySelector('.message'));
    tooltip.update();
    this.#state.renderedMessagesCount++;
    return messageElement;
  }

  /* ------------------------------------------------------------------------ */
  /*     Event handlers                                                       */
  /* ------------------------------------------------------------------------ */

  navigateToProfile() {
    router.navigate(`/profile/${this.#state.data.username}`);
  }

  async blockUser() {
    const request = { username: this.#state.data.username };
    const response = await apiRequest(
        'POST',
        /* eslint-disable-next-line new-cap */
        API_ENDPOINTS.USER_BLOCKED_USERS(this.#state.user.username),
        request,
        false,
        true,
    );
    const successMessage = 'User blocked successfully.';
    const errorMessage = 'Failed to block user. Please try again later.';
    if (response.success) {
      showAlertMessageForDuration(ALERT_TYPE.SUCCESS, successMessage, 3000);
      // TODO: Update chat list and current chat
      console.log('User blocked:', this.#state.data.username);
    } else {
      console.error('Error blocking user:', response);
      showAlertMessageForDuration(ALERT_TYPE.ERROR, errorMessage, 3000);
    }
  }

  toggleLikeMessage(event) {
    console.log('Toggle like message:', event.target);
    console.log('Current chat', this.#state.data);
    const messageBubble = event.target.closest('.bubble');
    if (!messageBubble) {
      return;
    }
    const messageId = messageBubble.getAttribute('message-id');
    const messageData = this.#state.data.messages.find((message) => message.id === messageId);
    const isLiked = !messageData.is_liked;
    messageData.is_liked = isLiked;
    messageBubble.querySelector('.message-liked').innerHTML = isLiked ?
        '<i class="bi bi-heart-fill h5"></i>' : '';
    this.#sendToggleLikeEvent(this.#state.data.chat_id, messageId, isLiked);
    // const customEvent = new CustomEvent('toggleLike', { detail: { messageId, isLiked }, bubbles: true });
    // this.dispatchEvent(customEvent);
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
        <img class="avatar-m rounded-circle me-3" alt="User" id="chat-header-avatar"/>

        <div class="d-flex flex-column text-start gap-1">
          <div class="d-flex flex-row gap-3">
            <h4 class="mb-0" id="chat-header-nickname"></h4>
            <p class="mb-0 fs-6" id="chat-header-username"></p>
          </div>
          <div class="d-flex flex-row align-items-center gap-2">
            <span class="online-status" id="chat-header-online-status-indicator"></span>
            <div id="chat-header-online-status"></div>
          </div>
        </div>
      </div>

      <div class="align-self-end">
        <button class="btn" id="chat-invite-play-button">Invite to play</button>
        <button class="btn" id="chat-block-user-button">Block</button>
      </div>

      </div>

      <!-- Messages -->
      <div class="flex-grow-1 overflow-auto ps-4 pe-3 pt-4 pb-3" id="chat-messages"></div>

      <!-- Input -->
      <div>
        <chat-message-input></chat-message-input>
      </div>
    </div>
	  `;
  }

  style() {
    return `
	  <style>
      #chat-messages {
        min-height: 0;
      }
      .left-align-message {
        padding-right: 32px;
        margin-bottom: 24px;
        .message-time {
          margin-left: 8px;
          margin-bottom: 4px;
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
        background-color: #f1f1f1;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        color: black;
      }
      .right-align-message .bubble {
        background-color: var(--pm-primary-500);
        color: white;
      }
      .chat-message-avatar {
        width: 36px;
        height: 36px;
        object-fit: cover;
        border-radius: 50%;
      }
      .bi-heart-fill {
        position: absolute;
        bottom: -20px;
        right: 8px;
        color: red;
      }
      .message-time {
        font-size: 12px;
      }
	  </style>
    `;
  }

  messageTemplate() {
    return `
    <img class="chat-message-avatar rounded-circle" alt="User" />
    <div class="message" data-bs-toggle="tooltip">
      <div class="bubble">
        <div class="message-content"></div>
        <div class="message-liked"></div>
      </div>
    </div>
    `;
  }
}

customElements.define('chat-message-area', ChatMessageArea);
