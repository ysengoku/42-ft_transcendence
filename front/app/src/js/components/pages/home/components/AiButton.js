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
	    <div id="home-ai-button">
	      <div class="btn btn-wood btn-lg">Play against AI</div>
	    </div>
	  `;
  }
}

customElements.define('home-ai-button', AiButton);
