// Login.js
import { router } from '@router';
import { apiRequest } from '@api';
import { API_ENDPOINTS } from '@api';
import './components/index.js';

export class Login extends HTMLElement {
  constructor() {
    super();
    this.state = {
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
  
      console.log('Login response full:', response);
  
      if (response && response.success === true) {
        // Vérifier si MFA est requis
        if (response.data && response.data.mfa_required === true) {
          console.log('Login successful, switching to MFA');
          const container = this.querySelector('.col-12.col-md-4');
          if (container) {
            console.log('Container found, replacing with MFA component');
            container.innerHTML = `
              <mfa-auth 
                mode="login" 
                data-username="${username}"
              ></mfa-auth>
            `;
          } else {
            console.error('Container not found');
          }
        } else {
          // Pas de MFA requis, connecter l'utilisateur directement
          console.log('Login successful, no MFA required');
          
          // Stocker les informations de l'utilisateur
          if (response.data) {
            localStorage.setItem('isLoggedIn', 'true');
            localStorage.setItem('user', JSON.stringify(response.data));
          }
          
          // Redirection vers la page d'accueil
          router.navigate('/home');
        }
      } else {
        console.log('Login response not successful:', response);
        this.setState({
          error: response.msg || 'Invalid login credentials'
        });
      }
    } catch (error) {
      console.error('Login error:', error);
      this.setState({
        error: error.msg || 'An error occurred during login'
      });
    }
  }

  render() {
    // if (this.isLoggedin) {
    //   router.navigate('/home');
    // }
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

customElements.define('login-page', Login);