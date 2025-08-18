/**
 * @module Home
 * @description This module defines the Home component for the application.
 * It serves as the main landing page after user authentication,
 * providing navigation options to various game modes, user's profile and settings.
 */

import { router } from '@router';
import { auth } from '@auth';
import { socketManager } from '@socket';
import './components/index.js';
import { showToastNotification, sessionExpiredToast } from '@utils';
import logo from '/img/logo.svg?url';

export class Home extends HTMLElement {
  #state = {
    user: null,
  };

  constructor() {
    super();
  }

  /**
   * @description Lifecycle method called when the component is connected to the DOM.
   * It checks if the user is authenticated by fetching the auth status.
   * If the user is not authenticated, it redirects to the landing page.
   * If authenticated, it retrieves the user data and renders the component.
   */
  async connectedCallback() {
    const loading = document.createElement('loading-animation');
    this.innerHTML = loading.outerHTML;
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
    this.#state.user = authStatus.response;
    this.render();
  }

  /**
   * @description Renders the navigation menu for the user.
   * It sets up the profile button with the user's username,
   * if the user has an ongoing game or tournament, it shows a toast notification.
   */
  render() {
    this.innerHTML = '';
    this.innerHTML = this.style() + this.template();
    const profileButton = this.querySelector('home-profile-button');
    profileButton.username = this.#state.user.username;

    if (this.#state.user.game_id) {
      showToastNotification('You have an ongoing game. Please click on Duel button to continue.');
    } else if (this.#state.user.tournament_id) {
      showToastNotification('You are currently in a tournament. Click on Tournament button to continue.');
      socketManager.openSocket('tournament', this.#state.user.tournament_id);
    }
  }

  template() {
    return `
    <div class="container d-flex justify-content-center align-items-center my-2">
      <div class="row justify-content-center text-center w-100">
        <div class="home-menu-wrapper col-12 col-sm-10 col-md-8 col-lg-6 col-xl-5 p-5">
          <img src="${logo}" alt="Peacemakers logo" class="py-3" id="home-logo"/>

          <div class="d-flex flex-column justify-content-center align-items-center pt-5 gap-4">
            <div class="w-100"><home-duel-button></home-duel-button></div>
            <div class="w-100"><home-localgame-button></home-localgame-button></div>
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
