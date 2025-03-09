import { auth } from '@auth';
import logo from '/img/sample-logo.svg?url';
import dune from '/img/dune.jpg?url';
import duneDay from '/img/dune-day.png?url';
import duneNight from '/img/dune-night.png?url';
import cloud from '/img/cloud.png?url';

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
      <div class="cloud"></div>
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

    let style = `
      <style>
        #content {
          background: url(${background});
          background-size: cover;
          z-index: 2;
        }
        .navbar {
          z-index: 3;
        }
        #landing-buttons {
          z-index: 4;
        }
    `;

    theme === 'light' ?
    style += `
      .cloud {
        position: absolute;
        top: -60px;
        left: 0;
        width: 100%;
        height: 100%;
        object-fit: cover;
        background: url(${cloud});
        animation: cloud 60s linear infinite;
        z-index: 1;
      }
      @keyframes cloud {
        0%{
          background-position: 0px;
        }
        100%{
          background-position: 5440px;
        }
      }
    ` :
    style += `
    `;

    return style += `</style>`;
  }
}

customElements.define('landing-page', Landing);
