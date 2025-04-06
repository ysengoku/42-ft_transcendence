import { router } from '@router';

export class DuelButton extends HTMLElement {
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

    this.button = this.querySelector('#home-duel-button');
    this.button.addEventListener('click', this.handleClick);
  }

  handleClick(event) {
    event.preventDefault();
    router.navigate('/duel-menu');
  }

  template() {
    return `
	  <div class="btn btn-wood btn-lg w-100" id="home-duel-button">Duel</div>
	  `;
  }
}

customElements.define('home-duel-button', DuelButton);
