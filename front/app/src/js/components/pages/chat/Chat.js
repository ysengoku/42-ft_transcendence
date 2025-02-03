export class Chat extends HTMLElement {
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
      </div>
        <div class="container-fluid d-flex flex-row flex-grow-1 py-4" style="height: 100vh;">
            <div class="col-md-3 border-end chat-list d-flex flex-column h-100 overflow-auto">
                <h5 class="py-3">Conversations</h5>
                <ul class="list-group flex-grow-1 overflow-auto" id="chatList">
                    <li class="list-group-item">Alice</li>
                    <li class="list-group-item active">JohnDoe1</li>
                    <li class="list-group-item">George</li>
                </ul>
            </div>

            <div class="col-md-9 chat-messages-area d-flex flex-column h-100 overflow-auto">
                <div class="chat-header border-bottom p-3 sticky-top">
                  JohnDoe1
                </div>
                <div class="chat-messages flex-grow-1 overflow-auto p-3" id="chatMessages" style="min-height: 0;">
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
                </div>
                <div class="chat-input m-4">
                  <div class="input-group">
                    <input type="text" id="messageInput" class="form-control" placeholder="Type a message...">
                    <button class="btn btn-primary" id="sendMessage">
                      <i class="bi bi-send"></i>
                    </button>
                  </div>
                </div>
            </div>
      </div>
    `;
  }
}

customElements.define('chat-page', Chat);
