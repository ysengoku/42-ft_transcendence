import { auth } from '@auth';
import logo from '/img/sample-logo.svg?url';
import dune from '/img/dune.jpg?url';
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
  }

  render() {
    this.innerHTML = this.template() + this.style();
  }

  template() {
    return `
      <div class="cloud"></div>
      <div class="container d-flex flex-column justify-content-center align-items-center text-center">
        <img src="${logo}" alt="logo" class="img-fluid w-100 mb-2">
            
        <div class="d-flex flex-column align-items-center" id="landinf-buttons"> 
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

  style() {
    return `
      <style>
        .container-fluid {
          background: url(${dune});
          background-size: cover;
        }
        .cloud {
          background: url (${cloud});
          position: absolute;
          top: -40px;
          left: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          background: url(img/cloud.png);
          animation: cloud 60s linear infinite;
          z-index: 1;
        }
        .navbar {
          z-index: 2;
        }
        @keyframes cloud{
          0%{
            background-position: 0px;
          }
          100%{
            background-position: 5440px;
          }
        }
        #landinf-buttons {
          z-index: 3;
        }
      </style>
    `;
  }
}

customElements.define('landing-page', Landing);
