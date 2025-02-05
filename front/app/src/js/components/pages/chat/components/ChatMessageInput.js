export class ChatMessageInput extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    this.render();
  }

  render() {
    this.innerHTML = `
      <div class="chat-input m-4">
        <div class="input-group">
          <input type="text" id="chatMessageInput" class="form-control" placeholder="Type a message...">
          <button class="btn btn-secondary" id="sendMessage">
            <i class="bi bi-send"></i>
          </button>
        </div>
      </div>
    `;

    const sendMessageButton = this.querySelector('#sendMessage');
    const messageInput = this.querySelector('#chatMessageInput');
    sendMessageButton.addEventListener('click', () => {
      const message = messageInput.value;
      console.log('Message:', message);
      if (message.trim() !== '') {
        const event = new CustomEvent('sendMessage', { detail: message, bubbles: true });
        document.dispatchEvent(event);
        messageInput.value = '';
      }
    });
    messageInput.addEventListener('keypress', (event) => {
      if (event.key === 'Enter') {
        const message = messageInput.value;
        console.log('Message:', message);
        if (message.trim() !== '') {
          const event = new CustomEvent('sendMessage', { detail: message, bubbles: true });
          document.dispatchEvent(event);
          messageInput.value = '';
        }
      }
    });
  }
}

customElements.define('chat-message-input', ChatMessageInput);
