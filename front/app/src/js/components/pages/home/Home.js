import { router } from '@router';
import { auth } from '@auth';
import './components/index.js';

export class Home extends HTMLElement {
  #state = {
    isLoggedin: false,
    user: null,
  };

  constructor() {
    super();
  }

  async connectedCallback() {
    const authStatus = await auth.fetchAuthStatus();
    this.#state.isLoggedin = authStatus.success;
    this.#state.user = auth.getStoredUser();
    this.render();
  }

  render() {
    if (!this.#state.isLoggedin) {
      router.navigate('/');
      return;
    }
    this.innerHTML = this.style() + this.template();

    const nicknameField = this.querySelector('#home-nickname');
    nicknameField.textContent = 'Welcome, ' + this.#state.user.nickname;

    const profileButton = this.querySelector('home-profile-button');
    profileButton.username = this.#state.user.username;
  }

  // Temporary content
  template() {
    return `
		<div class="container d-flex flex-column justify-content-center align-items-center text-center my-3">
			<div id="home-nickname"></div>
			<p>This is futur Home  ("hub?")</p>
			<div class="d-flex flex-column justify-content-center align-items-center grid gap-4 row-gap-4">
				<home-dual-button></home-dual-button>
				<home-tournament-button></home-tournament-button>
        <home-profile-button></home-profile-button>
				<home-settings-button></home-settings-button>
        <home-logout-button></home-logout-button>
			</div>
		</div>
		`;
  }

  style() {
    return `
    <style>
      #home-nickname {
        font-size: 3rem;
      }
    </style>
    `;
  }
}

customElements.define('user-home', Home);
