import { router } from '@router';
import { auth } from '@auth';

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

  async handleClick(event) {
    event.preventDefault();
    const authStatus = await auth.fetchAuthStatus();
    if (authStatus.success && authStatus.response.game_id) {
      devLog('Ongoing duel found. Redirect to game page', authStatus.response.game_id);
      router.navigate(`multiplayer-game/${authStatus.response.game_id}`);
      return;
    }
    router.navigate('/duel-menu');
  }

  template() {
    return `
	  <div class="btn btn-wood btn-lg w-100" id="home-duel-button">Duel</div>
	  `;
  }
}

customElements.define('home-duel-button', DuelButton);
