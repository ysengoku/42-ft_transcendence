import { router } from '@router';

export class TournamentButton extends HTMLElement {
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

    this.button = this.querySelector('#home-tournament-button');
    this.button.addEventListener('click', this.handleClick);
  }

  handleClick(event) {
    event.preventDefault();
    router.navigate('/tournament-menu');
  }

  template() {
    return `
    <div class="btn btn-wood btn-lg w-100" id="home-tournament-button">Tournament</div>
      `;
  }
}

customElements.define('home-tournament-button', TournamentButton);
