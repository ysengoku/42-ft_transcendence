export class ChatMessageHeader extends HTMLElement {
	constructor() {
	  super();
	}
  
	connectedCallback() {
	  this.render();
	}
  
	render() {
	  this.innerHTML = `
	    <div class="chat-header border-bottom p-3 sticky-top">
          <h5>
		    JohnDoe1
		  </h5>
        </div>
	  `;
	}
  }

customElements.define('chat-message-header', ChatMessageHeader);
