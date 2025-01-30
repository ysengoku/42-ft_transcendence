// oauth.js
import { router } from '@router';

export class OAuth extends HTMLElement {
  constructor() {
    super();
  }

  async handleOAuthClick(platform) {
    try {
      console.log(`Starting OAuth flow for ${platform}`);
      const response = await fetch(`/api/oauth/authorize/${platform}`); // when user clikcs on connect with 42, he is redirected to the API uri : authorize 
      
      console.log('Response status:', response.status);
      const data = await response.json();
      console.log('Response data:', data);

      if (data.error) {
        console.error('OAuth error:', data.error);
        alert(`OAuth error: ${data.error}`);
        return;
      }

      if (data.auth_url) {
        // Stocker la plateforme pour le callback
        sessionStorage.setItem('oauth_pending', 'true');
        sessionStorage.setItem('oauth_platform', platform); 
        // Redirection vers le provider OAuth
        console.log('Redirecting to OAuth provider:', data.auth_url);
        window.location.href = data.auth_url;
      } else {
        console.error('Invalid response structure:', data);
      }
    } catch (error) {
      console.error('OAuth authorization failed:', error);
      alert('OAuth authorization failed. Check the console for details.');
    }
  }

  connectedCallback() {
    this.render();
    this.querySelector('.btn-42').addEventListener('click', () => this.handleOAuthClick('42'));
    this.querySelector('.btn-github').addEventListener('click', () => this.handleOAuthClick('github'));
  }

  render() {
    this.innerHTML = `
      <div class='container d-flex flex-column justify-content-center align-items-center'>
        <div class="mb-3 w-100">
          <button class="btn btn-outline-primary w-100 py-2 my-2 btn-42">
            Login with 42
          </button>
          <button class="btn btn-outline-dark w-100 py-2 my-2 btn-github">
            Login with GitHub
          </button>
        </div>
      </div>
    `;
  }
}

customElements.define('oauth-component', OAuth);