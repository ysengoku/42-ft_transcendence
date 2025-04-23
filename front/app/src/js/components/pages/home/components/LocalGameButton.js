import { router } from '@router';

export class LocalGameButton extends HTMLElement {
  constructor() {
    super();
    this.navigateToMenu = this.navigateToMenu.bind(this);
  }

  connectedCallback() {
    this.render();
  }

  disconnectedCallback() {
    this.button.removeEventListener('click', this.navigateToMenu);
  }

  render() {
    this.innerHTML = this.template();

    this.button = this.querySelector('#home-localgame-button');
    this.button.addEventListener('click', this.navigateToMenu);
  }

  navigateToMenu(event) {
    event.preventDefault();
    // TODO: Update route
    router.navigate('/local-game-menu');
  }

  template() {
    return `
	  <div class="btn btn-wood btn-lg w-100" id="home-localgame-button">Local Game</div>
	  `;
  }
}

customElements.define('home-localgame-button', LocalGameButton);
