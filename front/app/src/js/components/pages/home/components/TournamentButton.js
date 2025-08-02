import { router } from '@router';
import { auth } from '@auth';
import { sessionExpiredToast } from '@utils';

export class TournamentButton extends HTMLElement {
  constructor() {
    super();

    this.homeElement = document.querySelector('user-home');
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

  async handleClick(event) {
    event.preventDefault();
    const authStatus = await auth.fetchAuthStatus();
    if (!authStatus.success) {
      if (authStatus.status === 429) {
        return;
      }
      if (authStatus.status === 401) {
        sessionExpiredToast();
      }
      router.redirect('/login');
      return;
    }
    if (authStatus.success && authStatus.response.tournament_id) {
      log.info('Ongoing tournament found. Redirect to tournament page', authStatus.response.tournament_id);
      router.navigate(`tournament/${authStatus.response.tournament_id}`);
      return;
    }
    router.navigate('/tournament-menu');
  }

  template() {
    return `
    <div class="btn btn-wood btn-lg w-100" id="home-tournament-button">Tournament</div>
      `;
  }
}

customElements.define('home-tournament-button', TournamentButton);
