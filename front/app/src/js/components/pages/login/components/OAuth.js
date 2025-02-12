import { API_ENDPOINTS } from '@api';
import { router } from '@router';
import { auth } from '@auth';

export class OAuth extends HTMLElement {
  constructor() {
      super();
      this.handleOAuthClick = this.handleOAuthClick.bind(this);
  }

  connectedCallback() {
      this.render();
      this.setupEventListeners();
  }

  setupEventListeners() {
      const btn42 = this.querySelector('.btn-42');
      const btnGithub = this.querySelector('.btn-github');
      
      if (btn42) btn42.addEventListener('click', () => this.handleOAuthClick('42'));
      if (btnGithub) btnGithub.addEventListener('click', () => this.handleOAuthClick('github'));
  }

  async handleOAuthClick(platform) {
    try {
        const response = await fetch(`https://localhost:1026/api/oauth/authorize/${platform}`)
        if (response.ok) {
            const data = await response.json()
            localStorage.setItem('oauth_platform', platform);
            location.href = data.auth_url
        }
    } catch (error) {
        console.error('OAuth initialization failed:', error);
        this.showError('Failed to start authentication process');
    }
}

  showError(message) {
      const feedback = this.querySelector('#login-failed-feedback');
      if (feedback) {
          feedback.innerHTML = `
              <div class="alert alert-danger alert-dismissible" role="alert">
                  ${this.escapeHtml(message)}
                  <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
              </div>
          `;
      }
  }

  escapeHtml(str) {
      const div = document.createElement('div');
      div.textContent = str;
      return div.innerHTML;
  }

  render() {
      this.innerHTML = `
          <div class="container">
              <div class="row justify-content-center">
                  <div class="col-md-6 text-center">
                      <h2 class="mb-4">Choose your login method</h2>
                      <div id="login-failed-feedback"></div>
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
