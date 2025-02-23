import { apiRequest, API_ENDPOINTS } from '@api';

export class MfaVerification extends HTMLElement {
  constructor() {
    super();
    this.username = '';
  }

  connectedCallback() {
    this.render();
    this.setupMfaVerificationHandler();
  }

  setupMfaVerificationHandler() {
    const mfaVerificationForm = this.querySelector('#mfa-verification-form');
    mfaVerificationForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      await this.handleMfaVerification();
    });
  }

  async handleMfaVerification() {
    this.username = sessionStorage.getItem('username');
    sessionStorage.removeItem('username');

    const code = this.querySelector('#mfa-code').value;
    if (!code) {
      this.showFeedback('mfa-failed-feedback', 'Verification code is required');
      return;
    }
    const response = await apiRequest('POST', API_ENDPOINTS.MFA_VERIFICATION, { username: this.username, code }, false, true);
    // TODO: Handle response
  }

  // usernameField.classList.add('is-invalid');
  //     document.querySelector('#username-feedback').textContent = emptyUsername;

  render() {
    this.innerHTML = `
      <div class="container my-3">
        <div class="row justify-content-center py-4">
          <div class="col-12 col-md-4"> 
            <div id="mfa-failed-feedback"></div>
            <div class="container d-flex flex-column justify-content-center align-items-center">
			        <form class="w-100" id="mfa-verification-form">
                <legend class="mt-4 mb-5 border-bottom">Check your email</legend>
    			      <label for="inputUsername" class="form-label">
                  Enter the verification code sent to your email
                </label>
   				      <input type="text" class="form-control" id="mfa-code" placeholder="code" autocomplete="off">
                <div class='invalid-feedback' id='username-feedback'></div>
					      <button type="submit" id="mfa-submit" class="btn btn-primary btn-lg w-100 pt-50">Login</button>
			        </form>
              <form class="w-100" id="resend-mfacode-form">
		        </div>
          </div>
        </div>
      </div>
    `;
  }
}

customElements.define('mfa-verification', MfaVerification);
