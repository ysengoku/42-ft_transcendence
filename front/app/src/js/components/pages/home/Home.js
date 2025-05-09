import { router } from '@router';
import { auth } from '@auth';
import './components/index.js';
import logo from '/img/logo.svg?url';

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

    const profileButton = this.querySelector('home-profile-button');
    profileButton.username = this.#state.user.username;
  }

  template() {
    return `
    <div class="container d-flex justify-content-center align-items-center my-2">
      <div class="row justify-content-center text-center w-100">
        <div class="home-menu-wrapper col-12 col-sm-10 col-md-8 col-lg-6 col-xl-5 p-5">
          <img src="${logo}" alt="Peacemakers logo" class="py-3" id="home-logo"/>

          <div class="d-flex flex-column justify-content-center align-items-center pt-5 gap-4">
            <div class="w-100"><home-duel-button></home-duel-button></div>
            <div class="w-100"><home-ai-button></home-ai-button></div>
            <div class="w-100"><home-tournament-button></home-tournament-button></div>
            <div class="w-100"><home-profile-button></home-profile-button></div>

            <div class="d-flex flex-row justify-content-center mt-3 gap-3 w-100">
              <home-settings-button></home-settings-button>
              <home-logout-button></home-logout-button>
            </div>
          </div>
        </div>
      </div>
    </div>
    `;
  }

  style() {
    return `
    <style>
    .home-menu-wrapper {
      background-color: rgba(var(--bs-body-bg-rgb), 0.2);
    }
    #home-logo {
      max-width: 320px;
    }
    </style>
    `;
  }
}

customElements.define('user-home', Home);
