import { router } from '@router';
import { auth } from '@auth';
import './components/index.js';

export class Login extends HTMLElement {
  constructor() {
    super();
    this.isLoggedin = false;
  }

  async connectedCallback() {
    const authStatus = await auth.fetchAuthStatus();
    console.log('authStatus:', authStatus);
    this.isLoggedin = authStatus.success;
    if (this.isLoggedin) {
      router.navigate('/home');
    }
    this.render();
  }

  render() {
    // if (this.isLoggedin) {
    //   router.navigate('/home');
    // }
    this.innerHTML = `
      <div class="container">
        <div class="row justify-content-center py-4">
          <div class="col-12 col-md-4"> 
            <div id="login-failed-feedback"></div>
                  <login-form></login-form>
                  <div class="container d-flex flex-column justify-content-center align-items-center">
                      <div class="mb-2">
                          <a href="/register" style="text-decoration: none;">Forgot password?</a>
                      </div>
                      <div class="mb-2 w-100 text-center py-3">
                        <div class="d-flex align-items-center">
                          <hr class="flex-grow-1">
                          <span class="mx-2">OR</span>
                          <hr class="flex-grow-1">
                        </div>
                      </div>
                      <div class="mb-3">
                          <a class="btn btn-link w-100 py-2" style="text-decoration: none;" href="/register" role="button">Not registered yet? <strong>Sign up now</strong></a>
                      </div>
                  </div>
                  <oauth-component></oauth-component>
              </div>
        </div>
      </div>
        `;
  }
}

customElements.define('login-page', Login);
