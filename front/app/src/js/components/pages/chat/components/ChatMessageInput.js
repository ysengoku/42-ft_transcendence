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
            <input type="text" id="messageInput" class="form-control" placeholder="Type a message...">
            <button class="btn btn-primary" id="sendMessage">
              <i class="bi bi-send"></i>
            </button>
          </div>
		</div>
	  `;
	}
  }

customElements.define('chat-message-input', ChatMessageInput);
