import { INPUT_FEEDBACK } from '@utils';

export class UserIdentityUpdate extends HTMLElement {
  #state = {
    username: '',
    nickname: '',
  };

  constructor() {
    super();
    this.newUserIdentity = {
      username: '',
      nickname: '',
    };
    this.handleUsernameInput = this.handleUsernameInput.bind(this);
    this.handleUsernameBlur = this.handleUsernameBlur.bind(this);
    this.handleNicknameInput = this.handleNicknameInput.bind(this);
    this.handleNicknameBlur = this.handleNicknameBlur.bind(this);
  }

  setParams(user) {
    this.#state.username = user.username;
    this.#state.nickname = user.nickname;
    this.render();
  }

  disconnectedCallback() {
    this.usernameInput.removeEventListener('input', this.handleUsernameInput);
    this.usernameInput.removeEventListener('blur', this.handleUsernameBlur);
    this.nicknameInput.removeEventListener('input', this.handleNicknameInput);
    this.nicknameInput.removeEventListener('blur', this.handleNicknameBlur);
  }

  render() {
    this.innerHTML = this.template();

    this.usernameInput = this.querySelector('#settings-username');
    this.nicknameInput = this.querySelector('#settings-nickname');
    this.usernameFeedback = this.querySelector('#settings-username-feedback');
    this.nicknameFeedback = this.querySelector('#settings-nickname-feedback');

    this.usernameInput.value = this.#state.username;
    this.nicknameInput.value = this.#state.nickname;

    this.usernameInput.addEventListener('input', this.handleUsernameInput);
    this.usernameInput.addEventListener('blur', this.handleUsernameBlur);
    this.nicknameInput.addEventListener('input', this.handleNicknameInput);
    this.nicknameInput.addEventListener('blur', this.handleNicknameBlur);
  }

  handleUsernameInput(event) {
    if (event.target.value.length < 1) {
      this.usernameFeedback.textContent = INPUT_FEEDBACK.CANNOT_DELETE_USERNAME;
      this.usernameInput.classList.add('is-invalid');
    } else {
      this.usernameFeedback.textContent = '';
      this.usernameInput.classList.remove('is-invalid');
    }
    if (event.target.value !== this.#state.username) {
      this.newUserIdentity.username = event.target.value;
    }
  }

  handleUsernameBlur(event) {
    if (event.target.value.length < 1) {
      event.target.value = this.#state.username;
      this.usernameInput.classList.remove('is-invalid');
      this.usernameFeedback.textContent = '';
    }
  }

  handleNicknameInput(event) {
    if (event.target.value.length < 1) {
      this.nicknameFeedback.textContent = INPUT_FEEDBACK.CANNOT_DELETE_NICKNAME;
      this.nicknameInput.classList.add('is-invalid');
    } else {
      this.nicknameFeedback.textContent = '';
      this.nicknameInput.classList.remove('is-invalid');
    }
    if (event.target.value !== this.#state.nickname) {
      this.newUserIdentity.nickname = event.target.value;
    }
  }

  handleNicknameBlur(event) {
    if (event.target.value.length < 1) {
      event.target.value = this.#state.nickname;
      this.nicknameInput.classList.remove('is-invalid');
      this.nicknameFeedback.textContent = '';
    }
  }

  template() {
    return `
	  <div class="mt-3">
		  <label for="settings-username" class="form-label">Username</label>
		  <input type="text" class="form-control" id="settings-username" autocomplete="off">
		  <div class="invalid-feedback" id="settings-username-feedback"></div>
	  </div>
	  <div class="mt-3">
		  <label for="settings-nickname" class="form-label">Nickname</label>
		  <input type="text" class="form-control" id="settings-nickname" autocomplete="off">
		  <div class="invalid-feedback" id="settings-nickname-feedback"></div>
	  </div>
	 `;
  }
}

customElements.define('settings-user-identity', UserIdentityUpdate);
