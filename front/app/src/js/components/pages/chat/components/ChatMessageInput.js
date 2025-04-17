import { showAlertMessageForDuration, ALERT_TYPE } from '@utils';

export class ChatMessageInput extends HTMLElement {
  #charCounter = 0;
  #maxChar = Number(import.meta.env.VITE_MAX_MESSAGE_LENGTH) || 255;

  constructor() {
    super();

    this.sendMessage = this.sendMessage.bind(this);
    this.countCharacters = this.countCharacters.bind(this);
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
  }

  render() {
    this.innerHTML = this.template();

    this.sendMessageButton = this.querySelector('#sendMessage');
    this.messageInput = this.querySelector('#chat-message-input');
    this.charCounter = this.querySelector('.char-counter');

    this.messageInput.setAttribute('maxlength', this.#maxChar);

    this.sendMessageButton?.addEventListener('click', this.sendMessage);
    this.messageInput?.addEventListener('keypress', this.sendMessage);
    this.messageInput?.addEventListener('input', this.countCharacters);
    this.messageInput?.addEventListener('keyup', this.countCharacters);
    this.messageInput?.addEventListener('keydown', this.countCharacters);
  }

  sendMessage(event) {
    if (event.key === 'Enter' || event.type === 'click') {
      const message = this.messageInput.value;
      if (message.length > this.#maxChar) {
        showAlertMessageForDuration(
            ALERT_TYPE.ERROR,
            `Cannot send the message. It exceeds maximum length of ${this>this.#maxChar} characters.`,
        );
        this.messageInput.value = '';
        return;
      }
      if (message.trim() !== '') {
        const customEvent = new CustomEvent('sendMessage', { detail: message, bubbles: true });
        document.dispatchEvent(customEvent);
        this.messageInput.value = '';
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
    this.charCounter.textContent = `${this.#charCounter}/${this.#maxChar} characters`;
    if (this.#charCounter === this.#maxChar) {
      this.charCounter.textContent = `Maximum length of ${this.#maxChar} characters reached`;
    }
    if (this.#charCounter > this.#maxChar - 10) {
      this.charCounter.classList.add('text-danger');
    } else {
      this.charCounter.classList.remove('text-danger');
    }
  }

  template() {
    return `
    <div class="d-flex flex-column mx-4 my-3 gap-2">
      <small class="char-counter text-end me-1 w-100"></small>
      <div class="input-group">
        <input type="text" id="chat-message-input" class="form-control" placeholder="Type a message..." autocomplete="off" maxlength="${this.#maxChar}" />
        <button class="btn btn-secondary" id="sendMessage">
          <i class="bi bi-send"></i>
        </button>
      </div>
    </div>
    `;
  }
}

customElements.define('chat-message-input', ChatMessageInput);
