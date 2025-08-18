import { router } from '@router';

export class ChatButton extends HTMLElement {
  constructor() {
    super();
    this.handleClick = this.handleClick.bind(this);
  }

  connectedCallback() {
    this.render();
  }

  disconnectedCallback() {
    this.button?.removeEventListener('click', this.handleClick);
  }

  render() {
    this.innerHTML = this.template();
    this.button = this.querySelector('button');
    this.button.addEventListener('click', this.handleClick);
  }

  handleClick() {
    router.navigate('/chat');
  }

  template() {
    return `
    <button class="navbar-button btn position-relative">
      <i class="bi bi-chat"></i>
      <span class="notification-badge d-none" id="navbar-chat-badge"></span>
    </button>
    `;
  }
}
customElements.define('chat-button', ChatButton);
