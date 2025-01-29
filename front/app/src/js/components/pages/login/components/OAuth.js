// oauth.js
import { router } from '@router';

export class OAuth extends HTMLElement {
  constructor() {
    super();
  }

  async handleOAuthClick(platform) {
    try {
      console.log(`Starting OAuth flow for ${platform}`);
      const response = await fetch(`/api/oauth/authorize/${platform}`);
      
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

// oauth-callback.js
export class OAuthCallback extends HTMLElement {
  constructor() {
    super();
  }

  async connectedCallback() {
    this.render();
    await this.handleCallback();
  }

  async handleCallback() {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const state = urlParams.get('state');
      
      // Extraire la plateforme de l'URL
      const platform = window.location.pathname.split('/').pop(); // Récupère '42api' ou 'github'
      console.log('OAuth callback for platform:', platform);

      if (!code || !state) {
        console.error('Missing code or state');
        router.navigate('/login');
        return;
      }

      // Appeler le endpoint de callback approprié
      const response = await fetch(`/api/oauth/callback?code=${code}&state=${state}&platform=${platform}`);
      const data = await response.json();

      console.log('Callback response:', data);

      if (data.status === 'success') {
        // Nettoyer les données de session
        sessionStorage.removeItem('oauth_pending');
        sessionStorage.removeItem('oauth_platform');
        
        // Simuler la connexion pour le router
        localStorage.setItem('isLoggedIn', 'true');
        
        router.navigate('/home');
      } else {
        console.error('Authentication failed:', data.error);
        router.navigate('/login');
      }

    } catch (error) {
      console.error('Callback handling failed:', error);
      router.navigate('/login');
    }
  }

  render() {
    this.innerHTML = `
      <div class="container text-center mt-5">
        <div class="spinner-border" role="status">
          <span class="visually-hidden">Loading...</span>
        </div>
        <p class="mt-3">Processing authentication...</p>
      </div>
    `;
  }
}

customElements.define('oauth-component', OAuth);
customElements.define('oauth-callback', OAuthCallback);