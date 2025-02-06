// oauth.js
import { router } from '@router';
import { API_ENDPOINTS } from '@api'; 

export class OAuth extends HTMLElement {
  constructor() {
    super();
  }


  async handleOAuthClick(platform) {
    try {
      // fetch(API_ENDPOINTS.OAUTH_AUTHORIZE(platform))
      // .then((response) => response.json())
      // .then((data) => console.log(data))
      // .catch((error) => console.error('OAuth aaaaaa failed:', error));
      console.log(`Starting OAuth flow for ${platform}`);

      const response = await fetch(API_ENDPOINTS.OAUTH_AUTHORIZE(platform));

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
      if (!platform) {
        console.error('No OAuth platform found');
        return;
      }

      if (platform) {
        try {
          const response = await fetch(API_ENDPOINTS.OAUTH_CALLBACK(platform), {
            method: 'GET',
            credentials: 'include',
          });

          const data = await response.json();
          console.log('OAuth callback data:', data);

          if (response.status === 200) {  // Modifie cette ligne
            console.log('User Info:', data);
            localStorage.setItem('isLoggedIn', 'true');
            localStorage.setItem('auth_token', data.auth_token || 'dummy_token'); // Vérifie si auth_token existe
            localStorage.setItem('userID', data.username); 
            router.navigate('/home');
          } else {
            console.error('OAuth callback error:', data.msg);
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
