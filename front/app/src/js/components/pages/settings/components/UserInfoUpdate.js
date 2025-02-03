import { INPUT_FEEDBACK } from '@utils/inputFeedback.js';

export class UserInfoUpdate extends HTMLElement {
  constructor() {
	super();
	this._user = {
	  username: '',
	  nickname: '',
	  email: ''
	};
	this.newUserInfo = {
	  username: '',
	  nickname: '',
	  email: ''
	};
   }

  setUserInfo(user) {
	this._user.username = user.username;
	this._user.nickname = user.nickname;
	this._user.email = user.email;
	this.render();
  }

  render() {
	this.innerHTML = `
	  <div class="mt-3">
		<label for="settings-username" class="form-label">Username</label>
		<input type="text" class="form-control" id="settings-username" value="${this._user.username}">
		<div class="invalid-feedback" id="settings-username-feedback"></div>
	  </div>
	  <div class="mt-3">
		<label for="settings-nickname" class="form-label">Nickrname</label>
		<input type="text" class="form-control" id="settings-nickname" value="${this._user.nickname}">
		<div class="invalid-feedback" id="settings-nickname-feedback"></div>
	  </div>
	  <div class="mt-3">
		<label for="settings-email" class="form-label">Email</label>
		<input type="email" class="form-control" id="settings-email" value="${this._user.email}">
		<div class="invalid-feedback" id="settings-email-feedback"></div>
	  </div>
	 `;

	const usernameInput = this.querySelector('#settings-username');
    usernameInput.addEventListener('input', (event) => {
	  const feedback = this.querySelector('#settings-username-feedback');
	  if (event.target.value.length < 1) {
		feedback.textContent = INPUT_FEEDBACK.EMPTY_USERNAME;
		usernameInput.classList.add('is-invalid');
	  } else {
		feedback.textContent = '';
		usernameInput.classList.remove('is-invalid');
	  }
	  if (event.target.value !== this._user.username) {
	    this.newUserInfo.username = event.target.value;
	  }
	});

	const nicknameInput = this.querySelector('#settings-nickname');
    nicknameInput.addEventListener('input', (event) => {
	  const feedback = this.querySelector('#settings-nickname-feedback');
	  if (event.target.value.length < 1) {
		feedback.textContent = INPUT_FEEDBACK.EMPTY_NICKNAME;
		nicknameInput.classList.add('is-invalid');
	  } else {
		feedback.textContent = '';
		nicknameInput.classList.remove('is-invalid');
	  }
	  if (event.target.value !== this._user.nickname) {
	    this.newUserInfo.nickname = event.target.value;
	  }
	});

	const emailInput = this.querySelector('#settings-email');
	emailInput.addEventListener('input', (event) => {
	  const feedback = this.querySelector('#settings-email-feedback');
	  if (event.target.value.length < 1) {
		feedback.textContent = INPUT_FEEDBACK.EMPTY_EMAIL;
		emailInput.classList.add('is-invalid');
	  } else {
		feedback.textContent = '';
		emailInput.classList.remove('is-invalid');
	  }
	  if (event.target.value !== this._user.email) {
	    this.newUserInfo.email = event.target.value;
	  }
	});
  }
}

customElements.define('settings-user-info', UserInfoUpdate);
