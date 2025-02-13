import { router } from '@router';

export class TournamentButton extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    this.render();
  }

  render() {
    this.innerHTML = `
      <div id="home-tournament-button">
        <div class="btn btn-primary btn-lg">Tournament</div>
      </div>
      `;

    const button = this.querySelector('#home-tournament-button');
    button.addEventListener('click', (event) => {
      event.preventDefault();
      router.navigate('/tournament-menu');
    });
  }
}

customElements.define('home-tournament-button', TournamentButton);
