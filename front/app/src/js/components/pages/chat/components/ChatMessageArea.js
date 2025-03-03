import { router } from '@router';
import { auth } from '@auth';
import { apiRequest, API_ENDPOINTS } from '@api';
import { showAlertMessageForDuration, ALERT_TYPE } from '@utils';

export class ChatMessageArea extends HTMLElement {
  #state = {
    user: null,
    data: [],
  };

  constructor() {
    super();

    this.handleNavigateToProfile = this.handleNavigateToProfile.bind(this);
    this.blockUser = this.blockUser.bind(this);
  }

  setData(data) {
    this.#state.user = auth.getStoredUser();
    this.#state.data = data;
    this.render();
  }

  disconnectedCallback() {
    this.header?.removeEventListener('click', this.handleNavigateToProfile);
    this.blockButoon?.removeEventListener('click', this.blockUser);
  }

  render() {
    this.innerHTML = this.template() + this.style();

    this.headerAvatar = this.querySelector('#chat-header-avatar');
    this.headerNickname = this.querySelector('#chat-header-nickname');
    this.headerUsername = this.querySelector('#chat-header-username');
    this.headerOnlineStatusIndicator = this.querySelector('#chat-header-online-status-indicator');
    this.headerOnlineStatus = this.querySelector('#chat-header-online-status');
    this.headerAvatar.src = this.#state.data.avatar;
    this.headerNickname.textContent = this.#state.data.nickname;
    this.headerUsername.textContent = `@${this.#state.data.username}`;
    this.headerOnlineStatusIndicator.classList.toggle('online', this.#state.data.is_online);
    this.headerOnlineStatus.textContent = this.#state.data.is_online ? 'online' : 'offline';

    this.renderMessages();

    this.header = this.querySelector('#chat-header');
    this.blockButoon = this.querySelector('#chat-block-user-button');

    this.header.addEventListener('click', this.handleNavigateToProfile);
    this.blockButoon.addEventListener('click', this.blockUser);
  }

  handleNavigateToProfile() {
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

  toggleLikeMessage(index) {
    this.#state.data.messages[index].liked = !this.#state.data.messages[index].liked;
    this.updateMessageElement(index);
  }

  updateMessageElement(index) {
    const message = this.#state.data.messages[index];
    const messageElement = this.querySelector(`[dataIndex='${index}'] .bubble`);
    if (messageElement) {
      messageElement.innerHTML = `
        ${message.message}
        ${message.liked ? '<i class="bi bi-heart-fill h5"></i>' : ''}
      `;
    }
  }

  renderMessages() {
    const chatMessages = this.querySelector('#chat-messages');
    chatMessages.innerHTML = '';
    this.#state.data.messages.forEach((message, index) => {
      const messageElement = document.createElement('div');
      messageElement.innerHTML = this.messageTemplate();
      messageElement.setAttribute('dataIndex', index);
      const messageContent = messageElement.querySelector('.bubble');

      if (message.sender === this.#state.data.username) {
        messageElement.classList.add(
            'left-align-message', 'd-flex', 'flex-row', 'justify-content-start',
            'align-items-center', 'gap-3',
        );
        messageContent.classList.add('me-5');
        messageElement.querySelector('.chat-message-avatar').src = this.#state.data.avatar;
        messageElement.querySelector('.message-content').textContent = message.message;
        messageElement.querySelector('.message-liked').innerHTML = message.liked ?
          '<i class="bi bi-heart-fill h5"></i>' : '';
      } else {
        messageElement.classList.add('right-align-message', 'd-flex', 'flex-row', 'justify-content-end',
            'align-items-center');
        messageContent.classList.add('ms-5');
        messageElement.querySelector('.chat-message-avatar').remove();
        messageElement.querySelector('.message-content').textContent = message.message;
        messageElement.querySelector('.message-liked').innerHTML = message.liked ?
          '<i class="bi bi-heart-fill h5"></i>' : '';
      }

      messageContent.addEventListener('click', () => {
        this.toggleLikeMessage(index);
      });
      chatMessages.appendChild(messageElement);
    });
    chatMessages.scrollTop = chatMessages.scrollHeight; // Scroll to the bottom of the chat messages
  }

  template() {
    return `
    <div class="d-flex flex-column h-100">

      <!-- Header -->
      <div class="d-flex flex-row justify-content-between align-items-center border-bottom ps-4 py-3 gap-3 sticky-top">
  
      <div class="d-flex flex-row" id="chat-header">
        <img class="rounded-circle me-3" alt="User" id="chat-header-avatar"/>

        <div class="d-flex flex-column text-start gap-1">
          <div class="d-flex flex-row gap-3">
            <h5 class="mb-0" id="chat-header-nickname"></h5>
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
      #chat-header-avatar {
        width: 52px;
        height: 52px;
        object-fit: cover;
      }
      .online-status {
        width: 12px;
        height: 12px;
        border-radius: 50%;
        background-color: grey;
      }
      .online-status.online {
        background-color: green;
      }
      .left-align-message {
        padding-right: 32px;
        margin-bottom: 24px;
      }
      .right-align-message {
        margin-left: 80px;
        margin-bottom: 24px;
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
        background-color: #007bff;
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
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.4);
        border-radius: 50%;
        color: red;
      }
	  </style>
    `;
  }

  messageTemplate() {
    return `
    <img class="chat-message-avatar rounded-circle" alt="User" />
      <div class="message">
        <div class="bubble">
          <div class="message-content"></div>
          <div class="message-liked"></div>
      </div>
    </div>
    `;
  }
}

customElements.define('chat-message-area', ChatMessageArea);
