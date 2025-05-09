import { router } from '@router';

export class AiButton extends HTMLElement {
  constructor() {
    super();
    this.handleClick = this.handleClick.bind(this);
  }

  connectedCallback() {
    this.render();
  }

  disconnectedCallback() {
    this.button.removeEventListener('click', this.handleClick);
  }

  render() {
    this.innerHTML = this.template();

    this.button = this.querySelector('#home-ai-button');
    this.button.addEventListener('click', this.handleClick);
  }

  handleClick(event) {
    event.preventDefault();
    // TODO: Update route
    router.navigate('/duel-menu');
  }

  template() {
    return `
	  <div class="btn btn-wood btn-lg w-100" id="home-ai-button">Play against AI</div>
	  `;
  }
}

customElements.define('home-ai-button', AiButton);
