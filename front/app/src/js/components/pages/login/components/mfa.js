// mfa.js
import { router } from '@router';
import { apiRequest } from '@api/apiRequest.js';
import { API_ENDPOINTS } from '@api/endpoints.js';

export class MFAAuth extends HTMLElement {
  constructor() {
    super();
    this.state = {
      error: '',
      message: '',
      qrCode: null,
      secret: null
    };
  }

  setState(newState) {
    this.state = { ...this.state, ...newState };
    this.render();
  }

  connectedCallback() {
    const mode = this.getAttribute('mode');
    if (mode === 'setup') {
      this.setupMFA();
    }
    this.render();
  }

  async setupMFA() {
    try {
      const username = this.getAttribute('data-username');
      const response = await apiRequest('POST', API_ENDPOINTS.MFA_SETUP, {
        username
      });

      if (response.status === 'success') {
        this.setState({
          qrCode: response.qr_code,
          secret: response.secret,
          message: 'Scan the QR code with your authenticator app',
          error: ''
        });
      }
    } catch (error) {
      this.setState({
        error: error.response?.detail || 'Failed to setup MFA'
      });
    }
  }

  async verifyCode(token) {
    try {
      const username = this.getAttribute('data-username');
      const mode = this.getAttribute('mode');
      const endpoint = mode === 'setup' ? API_ENDPOINTS.MFA_VERIFY : API_ENDPOINTS.MFA_VERIFY_LOGIN;

      const response = await apiRequest('POST', endpoint, {
        username,
        token
      });

      if (response.status === 'success') {
        if (mode === 'login') {
          // Terminer le login avec les tokens reçus
          localStorage.setItem('isLoggedIn', 'true');
          localStorage.setItem('user', JSON.stringify(response.user));
          const navBar = document.getElementById('navbar-container');
          if (navBar) {
            navBar.innerHTML = '<navbar-component></navbar-component>';
          }
          router.navigate('/home');
        } else {
          // Setup réussi
          this.setState({
            message: 'MFA successfully enabled',
            error: ''
          });
          setTimeout(() => router.navigate('/home'), 2000);
        }
      }
    } catch (error) {
      this.setState({
        error: error.response?.detail || 'Invalid verification code'
      });
    }
  }

  handleSubmit(event) {
    event.preventDefault();
    const token = this.querySelector('#token-input').value;
    
    if (!token || token.length !== 6 || !/^\d+$/.test(token)) {
      this.setState({
        error: 'Please enter a valid 6-digit code'
      });
      return;
    }

    this.verifyCode(token);
  }

  render() {
    const { error, message, qrCode, secret } = this.state;
    const mode = this.getAttribute('mode');

    this.innerHTML = `
      <div class="card">
        <div class="card-body">
          <h3 class="card-title text-center mb-4">
            ${mode === 'setup' ? 'Set Up Two-Factor Authentication' : 'Two-Factor Authentication'}
          </h3>

          ${error ? `
            <div class="alert alert-danger alert-dismissible" role="alert">
              ${error}
              <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            </div>
          ` : ''}

          ${message ? `
            <div class="alert alert-success alert-dismissible" role="alert">
              ${message}
              <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            </div>
          ` : ''}

          ${mode === 'setup' && qrCode ? `
            <div class="text-center mb-4">
              <p class="mb-3">1. Install an authenticator app (Google Authenticator, Microsoft Authenticator, or Authy)</p>
              <p class="mb-2">2. Scan this QR code with your app:</p>
              <img src="data:image/png;base64,${qrCode}" alt="QR Code" class="mb-3" style="max-width: 200px"/>
              <p class="mb-3">Can't scan? Enter this code manually: <code class="bg-light p-1">${secret}</code></p>
              <p class="mb-2">3. Enter the 6-digit code from your app below</p>
            </div>
          ` : `
            <p class="text-center mb-4">Enter the verification code from your authenticator app</p>
          `}

          <form onsubmit="return false;">
            <div class="mb-3">
              <input 
                type="text" 
                id="token-input"
                class="form-control text-center"
                placeholder="Enter 6-digit code"
                maxlength="6"
                pattern="[0-9]*"
                inputmode="numeric"
                autocomplete="one-time-code"
                required
              />
            </div>
            <button 
              onclick="this.getRootNode().host.handleSubmit(event)"
              class="btn btn-primary w-100"
            >
              Verify Code
            </button>
          </form>
        </div>
      </div>
    `;
  }
}

customElements.define('mfa-auth', MFAAuth);