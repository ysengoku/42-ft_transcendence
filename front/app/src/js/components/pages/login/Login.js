// login.js
import { router } from '@router';
import { apiRequest } from '@api/apiRequest.js';
import { API_ENDPOINTS } from '@api/endpoints.js';
import './components/index.js';

export class Login extends HTMLElement {
  constructor() {
    super();
    this.state = {
      showMfa: false,
      username: '',
      error: ''
    };
  }

  setState(newState) {
    this.state = { ...this.state, ...newState };
    this.render();
  }

  connectedCallback() {
    this.render();
    this.setupLoginHandler();
  }

  setupLoginHandler() {
    const form = this.querySelector('form');
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await this.handleLogin();
      });
    }
  }

  async handleLogin() {
    const username = this.querySelector('#username').value;
    const password = this.querySelector('#password').value;

    try {
      const response = await apiRequest('POST', API_ENDPOINTS.LOGIN, {
        username,
        password
      });

      if (response.mfa_required) {
        this.setState({
          showMfa: true,
          username: username,
          error: ''
        });
      } else {
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('user', JSON.stringify(response));
        const navBar = document.getElementById('navbar-container');
        if (navBar) {
          navBar.innerHTML = '<navbar-component></navbar-component>';
        }
        router.navigate('/home');
      }
    } catch (error) {
      this.setState({
        error: error.response?.detail || 'An error occurred during login'
      });
    }
  }

  render() {
    if (this.state.showMfa) {
      this.innerHTML = `
        <div class="container">
          <div class="row justify-content-center">
            <div class="col-12 col-md-6">
              <mfa-auth 
                mode="login" 
                data-username="${this.state.username}"
              ></mfa-auth>
            </div>
          </div>
        </div>
      `;
      return;
    }

    this.innerHTML = `
      <div class="container">
        <div class="row justify-content-center">
          <div class="col-12 col-md-4">
            ${this.state.error ? `
              <div class="alert alert-danger alert-dismissible" role="alert">
                ${this.state.error}
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
              </div>
            ` : ''}
            <form>
              <div class="mb-3">
                <label for="username" class="form-label">Username or Email</label>
                <input type="text" class="form-control" id="username" required>
              </div>
              <div class="mb-3">
                <label for="password" class="form-label">Password</label>
                <input type="password" class="form-control" id="password" required>
              </div>
              <div class="mb-3 py-3">
                <button type="submit" class="btn btn-primary btn-lg w-100">Login</button>
              </div>
            </form>
            <div class="container d-flex flex-column justify-content-center align-items-center">
              <div class="mb-2">
                <a href="/forgot-password" style="text-decoration: none;">Forgot password?</a>
              </div>
              <div class="mb-2 w-100 text-center py-3">
                <div class="d-flex align-items-center">
                  <hr class="flex-grow-1">
                  <span class="mx-2">OR</span>
                  <hr class="flex-grow-1">
                </div>
              </div>
              <div class="mb-3">
                <a class="btn btn-link w-100 py-2" style="text-decoration: none;" href="/register" role="button">
                  Not registered yet? <strong>Sign up now</strong>
                </a>
              </div>
            </div>
            <oauth-component></oauth-component>
          </div>
        </div>
      </div>
    `;
  }
}

customElements.define('login-view', Login);