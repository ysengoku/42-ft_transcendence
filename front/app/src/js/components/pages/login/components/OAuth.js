import { API_ENDPOINTS } from '@api/endpoints.js';
import { router } from '@router';
import { auth } from '@auth/authManager.js';

export class OAuth extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    this.render();
    this.setupEventListeners();
    
    // Vérifier si on arrive d'un callback OAuth
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    
    if (code && state) {
      this.handleOAuthCallback(code, state);
    }
  }

  setupEventListeners() {
    this.querySelector('.btn-42').addEventListener('click', () => this.handleOAuthClick('42'));
    this.querySelector('.btn-github').addEventListener('click', () => this.handleOAuthClick('github'));
  }

  async handleOAuthClick(platform) {
    try {
      console.log(`Starting OAuth flow for ${platform}`);
      window.location.href = API_ENDPOINTS.OAUTH_AUTHORIZE(platform);
      console.log('Redirecting to OAuth provider');
    } catch (error) {
      this.showError(`OAuth failed: ${error.message}`);
    }
  }

  async handleOAuthCallback(code, state) {
    try {
      const platform = localStorage.getItem('oauth_platform');
      const response = await fetch(`${API_ENDPOINTS.OAUTH_CALLBACK(platform)}?code=${code}&state=${state}`);
      
      if (!response.ok) {
        throw new Error('Authentication failed');
      }

      const data = await response.json();
      
      if (data.status === 'success') {
        // Stocker le token
        localStorage.setItem('access_token', data.access_token);
        localStorage.setItem('refresh_token', data.refresh_token);
        
        // Mettre à jour les informations utilisateur
        auth.setUser({
          username: data.user.username,
          avatar: data.user.avatar
        });

        // Mettre à jour la navbar
        const navbar = document.getElementById('navbar-container');
        if (navbar) {
          navbar.innerHTML = '<navbar-component></navbar-component>';
        }

        // Nettoyer le localStorage
        localStorage.removeItem('oauth_platform');
        
        // Rediriger vers la page d'accueil
        router.navigate('/home');
      } else {
        throw new Error(data.error || 'Authentication failed');
      }
    } catch (error) {
      this.showError(`Authentication failed: ${error.message}`);
      console.error('OAuth callback error:', error);
      router.navigate('/login');
    }
  }

  showError(message) {
    const container = this.querySelector('.container');
    const errorDiv = document.createElement('div');
    errorDiv.className = 'alert alert-danger mt-3';
    errorDiv.textContent = message;
    container.appendChild(errorDiv);
    
    setTimeout(() => errorDiv.remove(), 5000);
  }

  render() {
    this.innerHTML = `
      <div class='container'>
        <div class="row justify-content-center">
          <div class="col-md-6 text-center">
            <h2 class="mb-4">Choose your login method</h2>
            <div class="d-grid gap-3">
              <button class="btn btn-outline-primary btn-lg btn-42">
                Login with 42
              </button>
              <button class="btn btn-outline-dark btn-lg btn-github">
                Login with GitHub
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }
}

customElements.define('oauth-component', OAuth);
