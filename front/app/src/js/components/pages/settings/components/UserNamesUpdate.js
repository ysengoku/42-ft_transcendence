import { INPUT_FEEDBACK } from '@utils';

export class UserNamesUpdate extends HTMLElement {
  constructor() {
    super();
    this._user = {
      username: '',
      nickname: '',
    };
    this.newUserInfo = {
      username: '',
      nickname: '',
    };
  }

  setParams(user) {
    this._user.username = user.username;
    this._user.nickname = user.nickname;
    this.render();
    this.setEventListeners();
  }

  setEventListeners() {
    const usernameInput = this.querySelector('#settings-username');

    usernameInput.addEventListener('input', (event) => {
      const feedback = this.querySelector('#settings-username-feedback');
      if (event.target.value.length < 1) {
        feedback.textContent = INPUT_FEEDBACK.CANNOT_DELETE_USERNAME;
        usernameInput.classList.add('is-invalid');
      } else {
        feedback.textContent = '';
        usernameInput.classList.remove('is-invalid');
      }
      if (event.target.value !== this._user.username) {
        this.newUserInfo.username = event.target.value;
      }
    });

    usernameInput.addEventListener('blur', (event) => {
      if (event.target.value.length < 1) {
        event.target.value = this._user.username;
        usernameInput.classList.remove('is-invalid');
        this.querySelector('#settings-username-feedback').textContent = '';
      }
    });

    const nicknameInput = this.querySelector('#settings-nickname');

    nicknameInput.addEventListener('input', (event) => {
      const feedback = this.querySelector('#settings-nickname-feedback');
      if (event.target.value.length < 1) {
        feedback.textContent = INPUT_FEEDBACK.CANNOT_DELETE_NICKNAME;
        nicknameInput.classList.add('is-invalid');
      } else {
        feedback.textContent = '';
        nicknameInput.classList.remove('is-invalid');
      }
      if (event.target.value !== this._user.nickname) {
        this.newUserInfo.nickname = event.target.value;
      }
    });

    nicknameInput.addEventListener('blur', (event) => {
      if (event.target.value.length < 1) {
        event.target.value = this._user.nickname;
        nicknameInput.classList.remove('is-invalid');
        this.querySelector('#settings-nickname-feedback').textContent = '';
      }
    });
  }

  render() {
    this.innerHTML = `
	  <div class="mt-3">
		  <label for="settings-username" class="form-label">Username</label>
		  <input type="text" class="form-control" id="settings-username" value="${this._user.username}" autocomplete="off">
		  <div class="invalid-feedback" id="settings-username-feedback"></div>
	  </div>
	  <div class="mt-3">
		  <label for="settings-nickname" class="form-label">Nickname</label>
		  <input type="text" class="form-control" id="settings-nickname" value="${this._user.nickname}" autocomplete="off">
		  <div class="invalid-feedback" id="settings-nickname-feedback"></div>
	  </div>
	 `;
  }
}

customElements.define('settings-user-info', UserNamesUpdate);
