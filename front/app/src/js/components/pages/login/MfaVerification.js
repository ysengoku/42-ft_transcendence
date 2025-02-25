import { router } from '@router';
import { auth } from '@auth';
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
    // Input event listeners
    const otpInputs = this.querySelectorAll('.otp-input');
    otpInputs.forEach((input) => {
      input.addEventListener('input', (event) => {
        this.moveFocus(event, parseInt(input.id.split('-')[1]));
        if (input.value.length === 1) {
          this.otp = this.fetchInput();
        } else if (input.value.length < 1) {
          const otpSubmit = this.querySelector('#otp-submit');
          otpSubmit.classList.add('disabled');
        }
      });
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
                  <input type="text" maxlength="1" class="otp-input form-control" id="otp-0" autocomplete="off" />
                  <input type="text" maxlength="1" class="otp-input form-control" id="otp-1" autocomplete="off" />
                  <input type="text" maxlength="1" class="otp-input form-control" id="otp-2" autocomplete="off" />
                  <input type="text" maxlength="1" class="otp-input form-control" id="otp-3" autocomplete="off" />
                  <input type="text" maxlength="1" class="otp-input form-control" id="otp-4" autocomplete="off" />
                  <input type="text" maxlength="1" class="otp-input form-control" id="otp-5" autocomplete="off" />
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

  moveFocus(event, index) {
    const inputs = this.querySelectorAll('.otp-input');
    const currentInput = event.target;
    if (currentInput.value.length === 1 && index < 5) {
      inputs[index + 1].focus();
    } else if (currentInput.value.length < 1 && index > 0) {
      inputs[index - 1].focus();
    };
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
    this.username = sessionStorage.getItem('username')?.replace(/^"|"$/g, '');
    const otpInput = this.otp;
    const response = await apiRequest(
        'POST',
        /* eslint-disable-next-line new-cap */
        API_ENDPOINTS.MFA_VERIFICATION(this.username),
        { token: otpInput },
        false,
        false,
    );
    if (response.success) {
      const userInformation = {
        username: response.data.username,
        nickname: response.data.nickname,
        avatar: response.data.avatar,
      };
      auth.storeUser(userInformation);
      router.navigate(`/home`, response.user);
      sessionStorage.removeItem('username');
    } else {
      const feedback = document.querySelector('#mfa-failed-feedback');
      feedback.innerHTML = `
        <div class="alert alert-danger alert-dismissible" role="alert">
          ${response.msg}
          <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        </div>
      `;
    }
  }

  async resendMfaCode() {
    this.username = sessionStorage.getItem('username');
    const response = await apiRequest(
        'POST',
        /* eslint-disable-next-line new-cap */
        API_ENDPOINTS.MFA_RESEND(this.username),
        null,
        false,
        true,
    );
    if (response.success) {
      router.navigate('/mfa-verification', response.data);
    } else {
      // TODO: handle error
    }
  }
}

customElements.define('mfa-verification', MfaVerification);
