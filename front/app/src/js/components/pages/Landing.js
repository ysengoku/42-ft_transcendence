import { auth } from '@auth';
import logo from '/img/logo.svg?url';

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
    const button = this.#state.isLoggedIn ? this.buttonLoggedin() : this.buttonsNotLoggedin();
    return `
    <div class="container d-flex flex-column justify-content-center align-items-center text-center">
      <img src="${logo}" alt="logo" class="landing-logo img-fluid w-50 mt-5 pt-5">
      ${button}
    </div>
    `;
  }

  buttonsNotLoggedin() {
    return `
    <style>
      .pole {
        height: 240px;
      }
    </style>
    <div class="signpost d-flex justify-content-center align-items-start">
      <span class="pole"></span>
      <div class="d-flex flex-column justify-content-center align-items-center mt-3" id="landing-buttons">
        <a class="btn btn-wood landing-btn-1 mb-2" href="/login" role="button">Login</a>
        <a class="btn btn-wood landing-btn-2 mb-2" href="/register" role="button">Sign up</a>
      </div>
    </div>`;
  }

  buttonLoggedin() {
    return `
    <style>
      .pole {
        height: 160px;
      }
    </style>
    <div class="signpost d-flex justify-content-center align-items-start">
      <span class="pole"></span>
      <div class="d-flex flex-column justify-content-center align-items-center mt-3" id="landing-buttons">
        <a class="btn btn-wood landing-btn-1 mb-2" href="/home" role="button">Enter</a>
      </div>
    </div>`;
  }

  style() {
    return `
    <style>
    .landing-logo {
      max-width: 320px;
    }
    .signpost {
       padding-top: 160px;
    }
    #landing-buttons {
      z-index: 4;
      width: 100%;
      transform: translateX(-4%);
    }
    .btn-wood {
      width: 140%;
      position: relative;
      font-size: 1.4rem;
    }
    .landing-btn-1 {
      text-align: right;
      padding-right: 80px;
      transform: perspective(480px) rotateY(-45deg);
      left: 20%;
      clip-path: polygon(0% 0%, 92% 0%, 100% 47%, 100% 52%, 92% 100%, 0% 100%);
    }
    .landing-btn-2 {
      text-align: left;
      padding-left: 80px;
      transform: perspective(480px) rotateY(45deg);  
      right: 20%;
      clip-path: polygon(0% 50%, 8% 0%, 100% 0%, 100% 100%, 8% 100%, 0% 50%);
    }
    .pole {
      display: block;
      position: relative;
      left: 50%;
      transform: translateX(-50%);
      width: 16px;
      border-radius: 4px;
  
      --clrs1: color-mix(in lab, var(--pm-primary-600), var(--pm-primary-700) 50%);
      --clrs2: color-mix(in lab, var(--pm-primary-600), var(--pm-primary-700) 20%);
      --clrs3: color-mix(in lab, var(--pm-primary-600), var(--pm-primary-700) 60%);
      --clrs4: color-mix(in lab, var(--pm-primary-600), var(--pm-primary-700) 88%);
      background: var(--pm-primary-600);
      box-shadow: -1px 4px 1px #8F501A;
      linear-gradient(to right,
        var(--clrs1) 0%, 
        var(--clrs2) 20%,
        var(--clrs3) 50%, 
        var(--clrs4) 80%) 0 0 / 2px 100%; 
      filter: url('/filters/wood-grain.svg#wave-filter-0');
    }
    </style>
    `;
  }
}

customElements.define('landing-page', Landing);
