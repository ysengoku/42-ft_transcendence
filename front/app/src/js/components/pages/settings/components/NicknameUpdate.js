import { nicknameFeedback } from '@utils';

export class NicknameUpdate extends HTMLElement {
  #state = {
    nickname: '',
  };

  constructor() {
    super();
    this.newNickname = '';
    this.handleNicknameInput = this.handleNicknameInput.bind(this);
    this.handleNicknameFocusout = this.handleNicknameFocusout.bind(this);
  }

  setParams(user) {
    this.#state.nickname = user.nickname;
    this.render();
  }

  disconnectedCallback() {
    this.nicknameInput?.removeEventListener('input', this.handleNicknameInput);
    this.nicknameInput?.removeEventListener('blur', this.handleNicknameFocusout);
  }

  render() {
    this.innerHTML = this.template();

    this.nicknameInput = this.querySelector('#settings-nickname');
    this.nicknameFeedback = this.querySelector('#settings-nickname-feedback');

    this.nicknameInput.value = this.#state.nickname;

    this.nicknameInput.addEventListener('input', this.handleNicknameInput);
    this.nicknameInput.addEventListener('focusout', this.handleNicknameFocusout);
  }

  handleNicknameInput(event) {
    if (!nicknameFeedback(event.target, this.nicknameFeedback)) {
      return;
    } else {
      this.nicknameInput.classList.remove('is-invalid');
      this.nicknameFeedback.textContent = '';
    }
    if (event.target.value !== this.#state.nickname) {
      this.newNickname = event.target.value;
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
		  <label for="settings-nickname" class="form-label">Nickname</label>
		  <input type="text" class="form-control" id="settings-nickname" autocomplete="off">
		  <div class="invalid-feedback" id="settings-nickname-feedback"></div>
	  </div>
	 `;
  }
}

customElements.define('settings-nickname', NicknameUpdate);
