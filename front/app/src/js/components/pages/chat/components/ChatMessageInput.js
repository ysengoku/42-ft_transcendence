export class ChatMessageInput extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    this.render();
  }

  disconnectedCallback() {
    this.sendMessageButton?.removeEventListener('click', this.handleSendMessage);
    this.messageInput?.removeEventListener('keypress', this.handleSendMessage);
  }

  render() {
    this.innerHTML = this.template();

    this.sendMessageButton = this.querySelector('#sendMessage');
    this.messageInput = this.querySelector('#chat-message-input');

    this.handleSendMessage = (event) => {
      if (event.key === 'Enter' || event.type === 'click') {
        const message = this.messageInput.value;
        console.log('Message:', message);
        if (message.trim() !== '') {
          const customEvent = new CustomEvent('sendMessage', { detail: message, bubbles: true });
          document.dispatchEvent(customEvent);
          this.messageInput.value = '';
        }
      }
    };

    this.sendMessageButton?.addEventListener('click', this.handleSendMessage);
    this.messageInput?.addEventListener('keypress', this.handleSendMessage);
  }

  template() {
    return `
    <div class="chat-input mx-4 mt-3">
      <div class="input-group">
        <input type="text" id="chat-message-input" class="form-control" placeholder="Type a message..." autocomplete="off">
        <button class="btn btn-secondary" id="sendMessage">
          <i class="bi bi-send"></i>
        </button>
      </div>
    </div>
    `;
  }
}

customElements.define('chat-message-input', ChatMessageInput);
