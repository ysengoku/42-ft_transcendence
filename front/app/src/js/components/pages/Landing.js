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

    const themeObserver = new MutationObserver(() => {
      this.render();
    });
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-bs-theme'] });
  }

  render() {
    this.innerHTML = this.template() + this.style();
  }

  template() {
    return `
    <div class="container d-flex flex-column justify-content-center align-items-center text-center">
      <img src="${logo}" alt="logo" class="landing-logo img-fluid w-50 mb-4">
            
      ${ this.#state.isLoggedIn ?
      `<div class="d-flex flex-column align-items-center mt-4" id="landing-buttons"> 
        <div class="mb-3">
          <a class="btn btn-wood btn-lg" href="/home" role="button">Enter</a>
        </div>
      </div>` :
      `<div class="signpost d-flex justify-content-center align-items-start mt-6">
        <span class="pole"></span>
        <div class="d-flex flex-column justify-content-center align-items-center mt-3" id="landing-buttons">
          <a class="btn btn-wood mb-3" href="/login" role="button">Login</a>
          <a class="btn btn-wood mb-3" href="/register" role="button">Sign up</a>
        </div>
      </div>`
      }
    </div>
      `;
  }

  style() {
    return `
    <style>
    .landing-logo {
      max-width: 320px;
    }
    .signpost {
      margin-top: 160px;
      width: 200px;
    }
    #landing-buttons {
      z-index: 4;
      width: 100%;
      transform: translateX(-4%);
    }
    .btn-wood {
      width: 100%;
    }
    .landing-btn-1 {
      position: relative;
      text-align: left;
      padding-right: 96px;
      transform: perspective(440px) rotateY(45deg);  
      right: 16%;
    }
    .landing-btn-2 {
      position: relative;
      text-align: right;
      padding-left: 96px;
      transform: perspective(440px) rotateY(-45deg);
      left: 8%;
    }
    .pole {
      display: block;
      position: relative;
      left: 50%;
      transform: translateX(-50%);
      width: 16px;
      height: 216px;
      border-radius: 4px;
  
      --clrs1: color-mix(in lab, var(--pm-primary-600), var(--pm-primary-700) 50%);
      --clrs2: color-mix(in lab, var(--pm-primary-600), var(--pm-primary-700) 20%);
      --clrs3: color-mix(in lab, var(--pm-primary-600), var(--pm-primary-700) 60%);
      --clrs4: color-mix(in lab, var(--pm-primary-600), var(--pm-primary-700) 88%);
      background: var(--pm-primary-600);
      linear-gradient(to right,
        var(--clrs1) 0%, 
        var(--clrs2) 20%,
        var(--clrs3) 50%, 
        var(--clrs4) 80%) 0 0 / 2px 100%; 
      filter: url('/filters/wood-grain.svg#wave-filter-0');
      filter: drop-shadow(.1em .1em .1em color-mix(in srgb, var(--pm-primary-600), transparent 50%));
    }
    </style>
    `;
  }
}

customElements.define('landing-page', Landing);
