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
    this.isLoggedin = authStatus.success;
    if (this.isLoggedin) {
      router.navigate('/home');
    }
    this.render();
  }

  disconnectedCallback() {
    this.forgotPasswordButton?.removeEventListener('click', this.handleForgotPasswordClick);
    this.registerButton?.removeEventListener('click', this.handleRegisterClick);
  }

  render() {
    this.innerHTML = this.template();

    this.forgotPasswordButton = this.querySelector('#forgot-password-button');
    this.registerButton = this.querySelector('#link-to-register');

    this.handleForgotPasswordClick = () => {
      router.navigate('/forgot-password');
    };
    this.handleRegisterClick = () => {
      router.navigate('/register');
    };

    this.forgotPasswordButton.addEventListener('click', this.handleForgotPasswordClick);
    this.registerButton.addEventListener('click', this.handleRegisterClick);
  }

  template() {
    return `
      <div class="container my-3">
        <div class="row justify-content-center py-4">
          <div class="form-container col-12 col-md-4 p-4"> 
            <div id="login-failed-feedback"></div>

            <login-form></login-form>

            <div class="container d-flex flex-column justify-content-center align-items-center">
              <button class="btn w-100 py-2 mb-2 fs-5" type="button" id="forgot-password-button">
                Forgot password?
              </button>

              <div class="mb-2 w-100 text-center py-3">
                <div class="d-flex align-items-center">
                  <hr class="flex-grow-1">
                  <span class="mx-2">OR</span>
                  <hr class="flex-grow-1">
                </div>
              </div>

              <div class="mb-3">
                <button class="btn w-100 py-2 fs-5" type="button" id="link-to-register">
                  Not registered yet?  <strong>Sign up now</strong>
                </button>
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
