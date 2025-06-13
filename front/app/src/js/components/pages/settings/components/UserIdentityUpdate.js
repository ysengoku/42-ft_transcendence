import { usernameFeedback, nicknameFeedback } from '@utils';

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
    this.handleUsernameFocusout = this.handleUsernameFocusout.bind(this);
    this.handleNicknameInput = this.handleNicknameInput.bind(this);
    this.handleNicknameFocusout = this.handleNicknameFocusout.bind(this);
  }

  setParams(user) {
    this.#state.username = user.username;
    this.#state.nickname = user.nickname;
    this.render();
  }

  disconnectedCallback() {
    this.usernameInput.removeEventListener('input', this.handleUsernameInput);
    this.usernameInput.removeEventListener('focusout', this.handleUsernameFocusout);
    this.nicknameInput.removeEventListener('input', this.handleNicknameInput);
    this.nicknameInput.removeEventListener('blur', this.handleNicknameFocusout);
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
    this.usernameInput.addEventListener('focusout', this.handleUsernameFocusout);
    this.nicknameInput.addEventListener('input', this.handleNicknameInput);
    this.nicknameInput.addEventListener('focusout', this.handleNicknameFocusout);
  }

  handleUsernameInput(event) {
    if (usernameFeedback(event.target, this.usernameFeedback)) {
      this.usernameInput.classList.remove('is-invalid');
      this.usernameFeedback.textContent = '';
    }
    if (event.target.value !== this.#state.username) {
      this.newUserIdentity.username = event.target.value;
    }
  }

  handleUsernameFocusout(event) {
    const focusedElement = event.relatedTarget;
    if (focusedElement && focusedElement.matches('button[type="submit"]')) {
      return;
    }
    if (event.target.value.length < 1) {
      event.target.value = this.#state.username;
      this.usernameInput.classList.remove('is-invalid');
      this.usernameFeedback.textContent = '';
    }
  }

  handleNicknameInput(event) {
    if (!nicknameFeedback(event.target, this.nicknameFeedback)) {
      return;
    } else {
      this.nicknameInput.classList.remove('is-invalid');
      this.nicknameFeedback.textContent = '';
    }
    if (event.target.value !== this.#state.nickname) {
      this.newUserIdentity.nickname = event.target.value;
    }
  }

  handleNicknameFocusout(event) {
    const focusedElement = event.relatedTarget;
    if (focusedElement && focusedElement.matches('button[type="submit"]')) {
      return;
    }
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
