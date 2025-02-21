import { getCSRFTokenfromCookies } from '../../../../auth/csrfToken.js';

export class MFAAuth extends HTMLElement {
  constructor() {
    super();
    this.state = {
      error: '',
      message: '',
      codeSent: false,
    };
  }

  // Rendu automatique - L'appel à this.render() après la mise à jour de l'état garantit que l'interface utilisateur reflète toujours l'état actue
  setState(newState) {
    this.state = { ...this.state, ...newState };
    this.render();
  }

  connectedCallback() {
    console.log('MFA Auth connected, mode: login');
    this.sendVerificationCode();
    this.render();
  }

  async sendVerificationCode() {
    try {
      const CSRFToken = getCSRFTokenfromCookies();
      const username = this.getAttribute('data-username');
      console.log('Sending verification code to:', username);

      // Utilisation directe de fetch avec CSRF géré automatiquement
      const response = await fetch('/api/mfa/send-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': CSRFToken,
        },
        credentials: 'include', // Pour inclure les cookies
        // body: JSON.stringify({ username }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Code send response:', data);

        this.setState({
          codeSent: true,
          message: 'A verification code has been sent. Check console for test code.',
          error: '',
        });

        if (data.debug_code) {
          console.log('DEBUG CODE:', data.debug_code);
        }
      } else {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to send verification code');
      }
    } catch (error) {
      console.error('Error sending code:', error);
      this.setState({
        error: error.message || 'Failed to send verification code',
      });
    }
  }

  async verifyCode(token) {
    try {
      const CSRFToken = getCSRFTokenfromCookies();
      const username = this.getAttribute('data-username');
      console.log('Verifying token for:', username);

      const response = await fetch('/api/mfa/verify-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': CSRFToken,
        },
        credentials: 'include',
        body: JSON.stringify({ username, token }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Verification response:', data);

        // Stockage des données utilisateur
        localStorage.setItem('isLoggedIn', 'true');
        if (data.user) {
          localStorage.setItem('user', JSON.stringify(data.user));
        }

        // Mise à jour de la navbar
        const navBar = document.getElementById('navbar-container');
        if (navBar) {
          navBar.innerHTML = '<navbar-component></navbar-component>';
        }

        router.navigate('/home');
      } else {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Invalid verification code');
      }
    } catch (error) {
      console.error('Error verifying code:', error);
      this.setState({
        error: error.message || 'Failed to verify code',
      });
    }
  }

  render() {
    const { error, message, codeSent } = this.state;

    this.innerHTML = `
      <div class="card">
        <div class="card-body">
          <h3 class="card-title text-center mb-4">Two-Factor Authentication</h3>
          
          ${
            error
              ? `
            <div class="alert alert-danger" role="alert">
              ${error}
            </div>
          `
              : ''
          }
          
          ${
            message
              ? `
            <div class="alert alert-info" role="alert">
              ${message}
            </div>
          `
              : ''
          }
          
          <p class="text-center mb-4">
            ${codeSent ? 'Enter the verification code sent to your email' : 'Sending verification code...'}
          </p>
          
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
                ${!codeSent ? 'disabled' : ''}
              />
            </div>
            <button 
              onclick="this.getRootNode().host.handleSubmit(event)"
              class="btn btn-primary w-100"
              ${!codeSent ? 'disabled' : ''}
            >
              Verify Code
            </button>
            ${
              codeSent
                ? `
              <button 
                onclick="this.getRootNode().host.resendCode(event)"
                class="btn btn-link mt-2 w-100"
                type="button"
              >
                Didn't receive the code? Resend
              </button>
            `
                : ''
            }
          </form>
        </div>
      </div>
    `;
  }

  resendCode(event) {
    event.preventDefault();
    this.setState({
      codeSent: false,
      message: '',
      error: '',
    });
    this.sendVerificationCode();
  }

  handleSubmit(event) {
    event.preventDefault();
    const token = this.querySelector('#token-input').value;

    if (!token || token.length !== 6 || !/^\d+$/.test(token)) {
      this.setState({ error: 'Please enter a valid 6-digit code' });
      return;
    }

    this.verifyCode(token);
  }
}

customElements.define('mfa-auth', MFAAuth);
