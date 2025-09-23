import { API_ENDPOINTS } from '@api';
import { unknownErrorToast } from '@utils';

export class OAuth extends HTMLElement {
  constructor() {
    super();
    this.handleOAuthClick = this.handleOAuthClick.bind(this);
  }

  connectedCallback() {
    this.render();
  }

  disconnectedCallback() {
    this.btn42.removeEventListener('click', this.handleOauth42Click);
    this.btnGithub.removeEventListener('click', this.handleOauthGithubClick);
  }

  render() {
    this.innerHTML = this.template();

    this.btn42 = this.querySelector('.btn-42');
    this.btnGithub = this.querySelector('.btn-github');

    this.handleOauth42Click = async (event) => {
      event.preventDefault();
      await this.handleOAuthClick('42');
    };
    this.handleOauthGithubClick = async (event) => {
      event.preventDefault();
      await this.handleOAuthClick('github');
    };

    this.btn42.addEventListener('click', this.handleOauth42Click);
    this.btnGithub.addEventListener('click', this.handleOauthGithubClick);
  }

  async handleOAuthClick(platform) {
    /* eslint-disable-next-line new-cap */
    const response = await fetch(API_ENDPOINTS.OAUTH_AUTHORIZE(platform));

    if (response.ok) {
      const data = await response.json();
      location.href = data.auth_url;
    } else {
      log.error('OAuth initialization failed:', response.statusText);
      unknownErrorToast();
    }
  }

  template() {
    return `
    <div class="container d-flex flex-column justify-content-center align-items-center gap-2 mb-2">
      <button class="btn btn-wood btn-42 w-100">Sign in with 42</button>
      <button class="btn btn-wood btn-github w-100">Sign in with GitHub</button>
    </div>
    `;
  }
}

customElements.define('oauth-component', OAuth);
