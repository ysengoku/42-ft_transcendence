export class ChatMessageArea extends HTMLElement {
  constructor() {
	super();
  }

  connectedCallback() {
	this.render();
  }

  render() {
    this.innerHTML = `
	  <style>
	    .message {
          display: flex;
          justify-content: flex-start;
          margin-bottom: 10px;
        }
        .message.text-end {
          justify-content: flex-end;
        }
        .bubble {
          display: inline-block;
          padding: 10px 15px;
          border-radius: 20px;
          background-color: #f1f1f1;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          color: black;
        }
        .message.text-end .bubble {
          background-color: #007bff;
          color: white;
        }
	  </style>
	  <div class="p-3" id="chat-messages">

        <div class="d-flex flex-row align-items-center text-start mb-2 gap-3">

          <img src="/media/avatars/sample_avatar.jpg" class="rounded-circle" alt="User" style="width: 36px; height=36px"/>

          <div class="message text-start">
            <div class="bubble">
              Hello!
            </div>
          </div>
        </div>

        <div class="message text-end mb-2">
          <div class="bubble">
            Hi! How are you?
        </div>
      </div>
	`;
  }
}

customElements.define('chat-message-area', ChatMessageArea);
