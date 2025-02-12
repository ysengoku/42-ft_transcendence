import { API_ENDPOINTS } from '@api';
import { router } from '@router';
import { auth } from '@auth';

export class OAuth extends HTMLElement {
  constructor() {
      super();
      this.welcome = this.welcome.bind(this);
  }

  connectedCallback() {
      this.render();
      this.welcome();
  }


  async welcome() {
      try {
          const response = await fetch(
              `${API_ENDPOINTS.OAUTH_CALLBACK(platform)}?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`
          );

          if (!response.ok) throw new Error('Authentication failed');

          const data = await response.json();
          
          if (data.user) {
              auth.storeUser({
                  username: data.user.username,
                  nickname: data.user.nickname,
                  avatar: data.user.avatar,
              });
              localStorage.removeItem('oauth_platform');
              router.navigate('/home');
          } else {
            router.navigate('/home');
          }
      } catch (error) {
          console.error('OAuth callback failed:', error);
          this.showError(error.message);
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
            WELCOME
          </div>
      `;
  }
}

customElements.define('oauth-component', OAuth);