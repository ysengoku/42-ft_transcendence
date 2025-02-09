import { auth } from '@auth';
import logo from '/img/sample-logo.svg?url';

export class Landing extends HTMLElement {
  constructor() {
    super(); // Call the constructor of the parent class (HTMLElement)
    this.isLoggedIn = false;
  }

  async connectedCallback() {
    this.isLoggedIn = await auth.fetchAuthStatus();
    this.render();
  }

  render() {
    console.log('this.isLoggedIn', this.isLoggedIn);

    this.innerHTML = `
        <div class="container d-flex flex-column justify-content-center align-items-center text-center">
            <img src="${logo}" alt="logo" class="img-fluid w-100 mb-2">
            
            <div class="d-flex flex-column align-items-center"> 
            ${ this.isLoggedIn ?
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
}

customElements.define('landing-page', Landing);
