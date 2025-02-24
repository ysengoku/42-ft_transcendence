import { apiRequest, API_ENDPOINTS } from '@api';

export class MfaVerification extends HTMLElement {
  constructor() {
    super();
    this.username = '';
    this.otp = '';
  }

  connectedCallback() {
    this.render();
    this.setEventListeners();
  }

  setEventListeners() {
    // Input check and activate submit button
    const otpInputs = this.querySelectorAll('.otp-input');
    otpInputs.forEach((input) => {
      input.addEventListener('input', () => {
        this.moveFocus(input.id.split('-')[1]);
      });
    });
    const lastInput = this.querySelector('#otp-6');
    lastInput.addEventListener('input', () => {
      this.fetchInput();
    });

    const mfaVerificationForm = this.querySelector('#mfa-verification-form');
    mfaVerificationForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      await this.handleMfaVerification();
    });

    const resendButton = this.querySelector('#resend-mfacode-button');
    resendButton.addEventListener('click', () => {
      this.resendMfaCode();
    });
  }

  render() {
    this.innerHTML = `
        <div class="row justify-content-center m-4">
          <div class="col-12 col-md-4"> 
            <div id="mfa-failed-feedback"></div>
            <div class="container d-flex flex-column justify-content-center align-items-center">
              <form class="w-100" id="mfa-verification-form">
                <legend class="mt-4">Check your email</legend>
                <p>Enter the verification code sent to your email</p>

                <div class="otp-container d-flex flex-row my-4 gap-2">
                  <input type="text" maxlength="1" class="otp-input form-control" id="otp-1" autocomplete="off" />
                  <input type="text" maxlength="1" class="otp-input form-control" id="otp-2" autocomplete="off" />
                  <input type="text" maxlength="1" class="otp-input form-control" id="otp-3" autocomplete="off" />
                  <input type="text" maxlength="1" class="otp-input form-control" id="otp-4" autocomplete="off" />
                  <input type="text" maxlength="1" class="otp-input form-control" id="otp-5" autocomplete="off" />
                  <input type="text" maxlength="1" class="otp-input form-control" id="otp-6" autocomplete="off" />
                </div>

                <button type="submit" id="otp-submit" class="btn btn-primary w-100 disabled">Login</button>
              </form>
              <button class="btn w-100 mt-4" id="resend-mfacode-button">
                <small>Didn't receive the code? Resend email.</small>
              </button>
            </div>
          </div>
        </div>
    `;
  }

  moveFocus(index) {
    console.log('index: ', index);
    const currentInput = this.querySelector(`#otp-${index}`);
    const nextInput = this.querySelector(`#otp-${index + 1}`);
    const prevInput = this.querySelector(`#otp-${index - 1}`);

    if (currentInput.value.length === 1 && index < 6) {
      console.log('movefocus to next');
      nextInput.focus();
    }
    currentInput.addEventListener('keydown', (event) => {
      if (event.key === 'Backspace' && currentInput.value === '' && prevInput) {
        prevInput.focus();
      }
    });
  }

  fetchInput() {
    const otpInputs = this.querySelectorAll('.otp-input');
    let otp = '';
    otpInputs.forEach((input) => {
      otp += input.value;
    });
    if (otp.length !== 6) {
      return null;
    }
    const otpSubmit = this.querySelector('#otp-submit');
    otpSubmit.classList.remove('disabled');
    return otp;
  }

  async handleMfaVerification() {
    this.username = sessionStorage.getItem('username');
    const otpInput = this.otp;
    const response = await apiRequest(
        'POST',
        /* eslint-disable-next-line new-cap */
        API_ENDPOINTS.MFA_VERIFICATION(this.username),
        { token: otpInput },
        false,
        true,
    );
    // TODO: Handle response
    sessionStorage.removeItem('username');
  }

  resendMfaCode() {
    this.username = sessionStorage.getItem('username');
    apiRequest(
        'POST',
        /* eslint-disable-next-line new-cap */
        API_ENDPOINTS.MFA_RESEND(this.username),
        {},
        false,
        true,
    );
  }
}

customElements.define('mfa-verification', MfaVerification);
