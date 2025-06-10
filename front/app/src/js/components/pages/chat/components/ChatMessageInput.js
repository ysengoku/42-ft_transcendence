import { showAlertMessageForDuration, ALERT_TYPE } from '@utils';
import { MAX_CHAT_MESSAGE_LENGTH } from '@env';

export class ChatMessageInput extends HTMLElement {
  #charCounter = 0;

  constructor() {
    super();

    this.sendMessageButton = null;
    this.messageInput = null;
    this.charCounter = null;

    this.sendMessage = this.sendMessage.bind(this);
    this.countCharacters = this.countCharacters.bind(this);
    this.resizeTextarea = this.resizeTextarea.bind(this);
  }

  connectedCallback() {
    this.render();
  }

  disconnectedCallback() {
    this.sendMessageButton?.removeEventListener('click', this.sendMessage);
    this.messageInput?.removeEventListener('keypress', this.sendMessage);
    this.messageInput?.removeEventListener('input', this.countCharacters);
    this.messageInput?.removeEventListener('keyup', this.countCharacters);
    this.messageInput?.removeEventListener('keydown', this.countCharacters);
    this.messageInput?.removeEventListener('input', this.resizeTextarea);
  }

  render() {
    this.innerHTML = this.template();

    this.sendMessageButton = this.querySelector('#sendMessage');
    this.messageInput = this.querySelector('#chat-message-input');
    this.charCounter = this.querySelector('.char-counter');

    this.messageInput.setAttribute('maxlength', MAX_CHAT_MESSAGE_LENGTH);

    this.sendMessageButton?.addEventListener('click', this.sendMessage);
    this.messageInput?.addEventListener('keypress', this.sendMessage);
    this.messageInput?.addEventListener('input', this.countCharacters);
    this.messageInput?.addEventListener('keyup', this.countCharacters);
    this.messageInput?.addEventListener('keydown', this.countCharacters);
    this.messageInput?.addEventListener('input', this.resizeTextarea);
  }

  sendMessage(event) {
    if (event.key === 'Enter') {
      event.preventDefault();
    }
    if (event.key === 'Enter' || event.type === 'click') {
      const message = this.messageInput.value;
      if (message.length > MAX_CHAT_MESSAGE_LENGTH) {
        showAlertMessageForDuration(
          ALERT_TYPE.ERROR,
          `Cannot send the message. It exceeds maximum length of ${this > MAX_CHAT_MESSAGE_LENGTH} characters.`,
        );
        this.messageInput.value = '';
        return;
      }
      if (message.trim() !== '') {
        const customEvent = new CustomEvent('sendMessage', { detail: message, bubbles: true });
        document.dispatchEvent(customEvent);
        this.messageInput.value = '';
        this.messageInput.style.height = 'auto';
        this.charCounter.textContent = '';
        this.charCounter.classList.remove('text-danger');
      }
    }
  }

  countCharacters() {
    const message = this.messageInput.value;
    this.#charCounter = message.length;
    if (this.#charCounter === 0) {
      this.charCounter.textContent = '';
      this.charCounter.classList.remove('text-danger');
      return;
    }
    this.charCounter.textContent = `${this.#charCounter}/${MAX_CHAT_MESSAGE_LENGTH} characters`;
    if (this.#charCounter === MAX_CHAT_MESSAGE_LENGTH) {
      this.charCounter.textContent = `Maximum length of ${MAX_CHAT_MESSAGE_LENGTH} characters reached`;
    }
    if (this.#charCounter > MAX_CHAT_MESSAGE_LENGTH - 10) {
      this.charCounter.classList.add('text-danger');
    } else {
      this.charCounter.classList.remove('text-danger');
    }
  }

  resizeTextarea(event) {
    const textarea = event.target;
    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
  }

  template() {
    return `
    <style>
    #chat-message-input {
      resize: none;
      overflow: hidden;
    }
    </style>
    <div class="d-flex flex-column mx-4 my-3 gap-2">
      <small class="char-counter text-end me-1 w-100"></small>
      <div class="input-group">
        <textarea id="chat-message-input" class="form-control auto-resize" rows="1" placeholder="Type a message..." autocomplete="off"></textarea>
        <button class="btn btn-secondary" id="sendMessage">
          <i class="bi bi-send"></i>
        </button>
      </div>
    </div>
    `;
  }
}

customElements.define('chat-message-input', ChatMessageInput);
