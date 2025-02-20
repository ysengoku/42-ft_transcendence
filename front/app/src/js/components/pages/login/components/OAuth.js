import { API_ENDPOINTS } from '@api';
import { showAlertMessage, ALERT_TYPE, ALERT_MESSAGES } from '@utils';


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
      /* eslint-disable-next-line new-cap */
      const response = await fetch(API_ENDPOINTS.OAUTH_AUTHORIZE(platform));

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('oauth_platform', platform);
        location.href = data.auth_url;
      }
      else {
        console.error('OAuth initialization failed:', response.statusText);
        showAlertMessage(ALERT_TYPE.ERROR, ALERT_MESSAGES.UNKNOWN_ERROR);
      }
  }

  render() {
    this.innerHTML = `
      </style>
      <div class="container">
        <div class="row justify-content-center">
          <div class="col-12">
            <div class="d-grid gap-3">
              <button class="btn btn-primary btn-lg btn-42">
                Sign in with 42
              </button>
              <button class="btn btn-primary btn-lg btn-github">
                  Sign in with GitHub
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }
}

customElements.define('oauth-component', OAuth);
