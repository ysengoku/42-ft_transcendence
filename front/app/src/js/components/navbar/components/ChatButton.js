import {router} from '@router';

export class ChatButton extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    this.render();
  }

  render() {
    this.innerHTML = `
			<button class="btn btn-secondary me-2 rounded-circle">
				<i class="bi bi-chat-dots"></i>
			</button>
		`;

    this.querySelector('button').addEventListener('click', () => {
      router.navigate('/chat'); // Need to add username to path?
    });
  }
}
customElements.define('chat-button', ChatButton);
