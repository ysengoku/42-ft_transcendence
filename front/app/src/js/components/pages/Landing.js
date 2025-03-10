import { auth } from '@auth';
import { createClouds, createStars } from '@utils';
import logo from '/img/sample-logo.svg?url';
import duneDay from '/img/dune-day.png?url';
import duneNight from '/img/dune-night.png?url';

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

    if (theme === 'dark') {
      const contentContainer = document.getElementById('content');
      const cloud = document.getElementById('cloud');
      cloud ? contentContainer.removeChild(cloud) : null;

      document.body.style.backgroundImage = `linear-gradient( #080f1c 0%, #0d4261 32%,  #1473ab 100%)`;
      createStars();
    } else {
      const stars = document.getElementById('stars');
      stars ? document.body.removeChild(stars) : null;
      document.body.style.backgroundImage = `linear-gradient(rgb(225, 164, 99),rgb(160, 94, 50), #d47a3e)`;
      createClouds();
    }
  }

  template() {
    return `
    <div class="container d-flex flex-column justify-content-center align-items-center text-center">
      <img src="${logo}" alt="logo" class="img-fluid w-100 mb-2">
            
      <div class="d-flex flex-column align-items-center" id="landing-buttons"> 
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
    </style>
    `;
  }
}

customElements.define('landing-page', Landing);
