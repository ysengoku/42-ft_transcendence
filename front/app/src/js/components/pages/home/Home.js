import { router } from '@router';
import { auth } from '@auth';
import './components/index.js';

export class Home extends HTMLElement {
  constructor() {
    super();
    this.isLoggedin = false;
    this.user = null;
  }

  async connectedCallback() {
    const authStatus = await auth.fetchAuthStatus();
    this.isLoggedin = authStatus.success;
    this.user = auth.getStoredUser();
    this.render();
  }

  render() {
    if (!this.isLoggedin) {
      router.navigate('/');
      return;
    }

    // Temporary content
    this.innerHTML = `
		<div class="container d-flex flex-column justify-content-center align-items-center text-center my-3">
			<h1>Welcome, ${this.user.nickname}</h1>
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

    const profileButton = this.querySelector('home-profile-button');
    profileButton.username = this.user.username;
  }
}

customElements.define('user-home', Home);
