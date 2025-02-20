import { router } from '@router';
import { auth } from '@auth';
import { apiRequest, API_ENDPOINTS } from '@api';
import { showAlertMessageForDuration, ALERT_TYPE } from '@utils';

export class ChatMessageArea extends HTMLElement {
  constructor() {
    super();
    this.user = auth.getStoredUser();
    this._data = [];
  }

  setData(data) {
    this._data = data;
    this.render();
    this.setEventListeners();
  }

  setEventListeners() {
    const header = this.querySelector('#chat-header');
    header.addEventListener('click', () => {
      router.navigate(`/profile/${this._data.username}`);
    });

    const blockButoon = this.querySelector('#chat-block-user-button');
    blockButoon.addEventListener('click', async () => {
      const response = await this.blockUser();
      if (response) {
        // TODO: Update chat list and current chat
        console.log('User blocked:', this._data.username);
      }
    });
  }

  async blockUser() {
    const request = { username: this._data.username };
    const response = await apiRequest(
        'POST',
        /* eslint-disable-next-line new-cap */
        API_ENDPOINTS.USER_BLOCKED_USERS(this.user.username),
        request,
        false,
        true,
    );
    const successMessage = 'User blocked successfully.';
    const errorMessage = 'Failed to block user. Please try again later.';
    if (response.success) {
      showAlertMessageForDuration(ALERT_TYPE.SUCCESS, successMessage, 3000);
      return true;
    } else {
      console.error('Error blocking user:', response);
      showAlertMessageForDuration(ALERT_TYPE.ERROR, errorMessage, 3000);
      return false;
    }
  }

  toggleLikeMessage(index) {
    this._data.messages[index].liked = !this._data.messages[index].liked;
    this.updateMessageElement(index);
  }

  updateMessageElement(index) {
    const message = this._data.messages[index];
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
    this._data.messages.forEach((message, index) => {
      const messageElement = document.createElement('div');
      messageElement.setAttribute('dataIndex', index);
      if (message.sender === this._data.username) {
        messageElement.classList.add(
            'left-align-message', 'd-flex', 'flex-row', 'justify-content-start',
            'align-items-center', 'gap-3',
        );
        messageElement.innerHTML = `
          <img src="${this._data.avatar}" class="chat-message-avatar rounded-circle" alt="User" />
          <div class="message">
            <div class="bubble me-5">
              ${message.message}
              ${message.liked ? '<i class="bi bi-heart-fill h5"></i>' : ''}
            </div>
          </div>
        `;
      } else {
        messageElement.classList.add('right-align-message', 'd-flex', 'flex-row', 'justify-content-end',
            'align-items-center');
        messageElement.innerHTML = `
          <div class="bubble ms-5">
            ${message.message}
            ${message.liked ? '<i class="bi bi-heart-fill h5"></i>' : ''}
          </div>
        `;
      }
      const messageContent = messageElement.querySelector('.bubble');
      messageContent.addEventListener('click', () => {
        this.toggleLikeMessage(index);
      });
      chatMessages.appendChild(messageElement);
    });
    chatMessages.scrollTop = chatMessages.scrollHeight; // Scroll to the bottom of the chat messages
  }

  render() {
    this.innerHTML = `
	  <style>
      #chat-messages {
        min-height: 0;
      }
      #chat-message-header-avatar {
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
    <div class="d-flex flex-column h-100">

      <!-- Header -->
      <div class="d-flex flex-row justify-content-between align-items-center border-bottom bg-dark ps-4 py-3 gap-3 sticky-top">
  
      <div class="d-flex flex-row" id="chat-header">
        <img src="${this._data.avatar}" class="rounded-circle me-3" alt="User" id="chat-message-header-avatar"/>

        <div class="d-flex flex-column text-start gap-1">
          <div class="d-flex flex-row gap-3">
            <h5 class="mb-0">${this._data.nickname}</h5>
            <p class="mb-0 fs-6">@${this._data.username}</p>
          </div>
          <div class="d-flex flex-row align-items-center gap-2">
            <span class="online-status ${this._data.is_online ? 'online' : ''}"></span>
            ${this._data.is_online ? 'online' : 'offline'}
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
    this.renderMessages();
  }
}

customElements.define('chat-message-area', ChatMessageArea);
