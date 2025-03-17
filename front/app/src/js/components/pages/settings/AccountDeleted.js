import { router } from '@router';
import { auth } from '@auth';

export class AccountDeleted extends HTMLElement {
  #state = {
    nickname: '',
  };

  constructor() {
    super();
  }

  connectedCallback() {
    const user = auth.getStoredUser();
    if (!user) {
      router.navigate('/');
      return;
    }
    this.#state.nickname = auth.getStoredUser().nickname;
    this.render();
    auth.clearStoredUser();
  }

  disconnectedCallback() {
    this.backToLandingPageButton?.removeEventListener('click', this.handleBackToLandingPage);
  }

  render() {
    this.innerHTML = this.template();

    const titre = this.querySelector('h1');
    titre.textContent = `Farewell, ${this.#state.nickname}!`;

    this.backToLandingPageButton = this.querySelector('#back-to-landingpage');
    this.handleBackToLandingPage = () => {
      router.navigate('/');
    };
    this.backToLandingPageButton.addEventListener('click', this.handleBackToLandingPage);
  }

  template() {
    return `
    <div class="d-flex flex-column align-items-center justify-content-center my-5">
      <h1></h1>
      <p class>Your journey ends here, but Peacemakers' town will always be here. Should you return, adventure awaits...</p>
      <button class="btn btn-primary mt-5" id="back-to-landingpage">Leave the town</button>
    </div>
    `;
  }

  style() {
    return `
    <style>
    </style>
    `;
  }
}

customElements.define('account-deleted', AccountDeleted);
