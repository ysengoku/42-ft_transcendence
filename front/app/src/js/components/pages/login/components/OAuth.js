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

  async checkOAuthCallback() {
    const oauthPending = sessionStorage.getItem('oauth_pending');
    if (oauthPending === 'true') {
      const platform = sessionStorage.getItem('oauth_platform');
      if (platform) {
        try {
          const response = await fetch(`/api/oauth/callback/${platform}`, {
            method: 'GET',
            credentials: 'include'
          });

          const data = await response.json();
          console.log('OAuth callback data:', data);

          if (data.status === 'success') {
            console.log('User Info:', data.user_info);  // Print user info for the moment
            // router.navigate(`/home`, response.user);
          } else {
            console.error('OAuth callback error:', data.error);
          }
        } catch (error) {
          console.error('OAuth callback failed:', error);
        } finally {
          sessionStorage.removeItem('oauth_pending');
          sessionStorage.removeItem('oauth_platform');
        }
      }
    }
  }

  connectedCallback() {
    this.render();
    this.querySelector('.btn-42').addEventListener('click', () => this.handleOAuthClick('42'));
    this.querySelector('.btn-github').addEventListener('click', () => this.handleOAuthClick('github'));

    // Vérifier si on revient d'une redirection OAuth
    this.checkOAuthCallback();
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