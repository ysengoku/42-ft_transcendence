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
    <div class="signpost d-flex justify-content-center align-items-start mb-2">
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
       padding-top: 232px;
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
    .landing-btn-1:hover,
     .landing-btn-2:hover {
      color: var(--pm-gray-300);
    }
    .landing-btn-1:hover {
      transform: perspective(240px) rotateY(-45deg);
    }
    .landing-btn-2:hover {
      transform: perspective(240px) rotateY(45deg);
    }
    .pole {
      display: block;
      position: relative;
      left: 50%;
      transform: translateX(-50%);
      width: 16px;
      border-radius: 4px;
  
      --clrs1: color-mix(in lab, var(--pm-primary-500), var(--pm-primary-700) 50%);
      --clrs2: color-mix(in lab, var(--pm-primary-500), var(--pm-primary-700) 40%);
      --clrs3: color-mix(in lab, var(--pm-primary-500), var(--pm-primary-700) 60%);
      --clrs4: color-mix(in lab, var(--pm-primary-500), var(--pm-primary-700) 90%);
      background: var(--pm-primary-400)
        linear-gradient(88deg, 
          var(--clrs1),
          var(--clrs2) 40% 60%,
          var(--clrs3) 90%,
         var(--clrs4)) 0 0 / 100% 0.2rem;
    }
    </style>
    `;
  }
}

customElements.define('landing-page', Landing);
