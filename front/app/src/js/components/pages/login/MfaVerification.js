import { router } from '@router';
import { auth } from '@auth';
import { apiRequest, API_ENDPOINTS } from '@api';
import { showFormErrorFeedback, showAlertMessageForDuration, ALERT_TYPE } from '@utils';

export class MfaVerification extends HTMLElement {
  #state = {
    username: '',
    otp: '',
  };

  constructor() {
    super();
    this.handleInput = this.handleInput.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
    this.resendMfaCode = this.resendMfaCode.bind(this);
  }

  connectedCallback() {
    this.render();
  }

  render() {
    this.innerHTML = this.style() + this.template();

    this.otpInputs = this.querySelectorAll('.otp-input');
    this.mfaVerificationForm = this.querySelector('#mfa-verification-form');
    this.resendButton = this.querySelector('#resend-mfacode-button');

    this.otpInputs.forEach((input) => {
      input.addEventListener('input', this.handleInput);
    });

    this.mfaVerificationForm.addEventListener('submit', this.handleSubmit);
    this.resendButton.addEventListener('click', this.resendMfaCode);
  }

  disconnectedCallback() {
    this.otpInputs.forEach((input) => {
      input.removeEventListener('input', this.handleInput);
    });
    this.mfaVerificationForm.removeEventListener('submit', this.handleSubmit);
    this.resendButton.removeEventListener('click', this.resendMfaCode);
  }

  handleInput(event) {
    const input = event.target;
    this.moveFocus(event, parseInt(input.id.split('-')[1]));
    if (input.value.length === 1) {
      this.#state.otp = this.fetchInput();
    } else if (input.value.length < 1) {
      const otpSubmit = this.querySelector('#otp-submit');
      otpSubmit.classList.add('disabled');
    }
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

  async handleSubmit(event) {
    event.preventDefault();
    await this.handleMfaVerification();
  };

  async handleMfaVerification() {
    this.#state.username = sessionStorage.getItem('username');
    const otpInput = this.#state.otp;
    const response = await apiRequest(
        'POST',
        /* eslint-disable-next-line new-cap */
        API_ENDPOINTS.MFA_VERIFICATION(this.#state.username),
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
      this.feedbackField = this.querySelector('#mfa-failed-feedback');
      this.feedbackField.innerHTML = '';
      showFormErrorFeedback(this.feedbackField, response.msg);
    }
  }

  async resendMfaCode() {
    this.#state.username = sessionStorage.getItem('username');
    const response = await apiRequest(
        'POST',
        /* eslint-disable-next-line new-cap */
        API_ENDPOINTS.MFA_RESEND_CODE(this.#state.username),
        null,
        false,
        true,
    );
    if (response.success) {
      showAlertMessageForDuration(ALERT_TYPE.SUCCESS, 'Email resent successfully', 3000);
    } else {
      showFormErrorFeedback(this.feedbackField, response.msg);
    }
  }

  template() {
    return  `
    <div class="row justify-content-center m-4">
      <div class="form-container col-12 col-md-4 p-4"> 
        <div id="mfa-failed-feedback"></div>
        <div class="container d-flex flex-column justify-content-center align-items-center">
          <form class="text-center w-100" id="mfa-verification-form">
            <legend class="mt-4">Check your email</legend>
            <p>Enter the verification code sent to your email</p>

            <div class="otp-container d-flex flex-row justify-content-center my-4">
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

  style() {
    return `
    <style>
      .otp-container {
        gap: 0.5rem;
      }
      .otp-input {
        width: 2.5rem;
        text-align: center;
      }
      @media (max-width: 992px) and (min-width: 768px) {
        .otp-container {
          gap: 0.3rem;
        }
        .otp-input {
          width: 2rem;
          font-size: 0.8rem;
        }
      }
    </style>
  `;
  }
}

customElements.define('mfa-verification', MfaVerification);
