import { auth } from '@auth';
import { createClouds, createStars } from '@utils'; 
import logo from '/img/logo.svg?url';
import duneDay from '/img/dunes-day.png?url';
import duneNight from '/img/dunes-night.png?url';

export class Landing extends HTMLElement {
  #state = {
    isLoggedIn: false,
  };

  constructor() {
    super();
  }

  async connectedCallback() {
    this.#state.isLoggedIn = auth.getStoredUser() ? true : false;
    this.render();

    const themeObserver = new MutationObserver(() => {
      this.render();
    });
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-bs-theme'] });
  }

  render() {
    const theme = document.documentElement.getAttribute('data-bs-theme') || 'light';
    this.innerHTML = this.template() + this.style(theme);
  }

  template() {
    return `
    <div class="container d-flex flex-column justify-content-center align-items-center text-center">
      <img src="${logo}" alt="logo" class="landing-logo img-fluid w-50 mb-2">
            
      <div class="d-flex flex-column align-items-center mt-4" id="landing-buttons"> 
        ${ this.#state.isLoggedIn ?
          `<div class="mb-3">
            <a class="btn btn-primary btn-lg" href="/home" role="button">Enter</a>
          </div>` :
          `<div class="mb-3">
            <a class="btn btn-primary btn-lg" href="/login" role="button">Login</a>
          </div>
          <div class="mb-3">
            <a class="btn btn-outline-primary" href="/register" role="button">Sign up</a>
          </div>`}
      </div>
    </div>
      `;
  }

  style(theme) {
    const background = theme === 'light' ? duneDay : duneNight;
    return `
    <style>
      #content {
        background: url(${background});
        background-size: cover;
        background-position: bottom;
      }
      #landing-buttons {
        z-index: 4;
      }
      .landing-logo {
        max-width: 320px;
      }
    </style>
    `;
  }
}

customElements.define('landing-page', Landing);
