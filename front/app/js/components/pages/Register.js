import { router } from '../../main.js';
import { simulateApiLogin } from '../../mock/mockApiLogin.js';

export class Register extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    this.render();
	this.setupRegisterHandler();
  }

  render() {
    this.innerHTML = `
	<div class="container d-flex flex-column justify-content-center align-items-center">
		<form class="w-100">
  			<div class="mb-3">
    			<label for="inputUsername" class="form-label">Username</label>
   				<input type="username" class="form-control" id="inputUsername">
  			</div>
			<div class="mb-3">
				<label for="inputEmail" class="form-label">Email</label>
    			<input type="email" class="form-control" id="inputEmail">
  			</div>
			<div class="mb-3">
				<label for="inputPassword" class="form-label">Password</label>
    			<input type="password" class="form-control" id="inputPassword">
  			</div>
			<div class="mb-3">
				<label for="inputConfirmPassword" class="form-label">Confirm Password</label>
    			<input type="confirmPassword" class="form-control" id="inputConfirmPassword">
  			</div>
			<div class="mb-3 py-3">
				<button type="submit" id="registerSubmit" class="btn btn-primary btn-lg w-100 pt-50">Register</button>
			</div>
		</form>
	</div>
	`;
  }

setupRegisterHandler() {
	  const form = this.querySelector("form");
  form.addEventListener("submit", (event) => {
	event.preventDefault();
	this.handleRegister();
  });
}

async handleRegister() {
	  const username = this.querySelector("#inputUsername").value;
  const email = this.querySelector("#inputEmail").value;
  const password = this.querySelector("#inputPassword").value;
  const confirmPassword = this.querySelector("#inputConfirmPassword").value;

	window.location.href = "/login";
};
}

customElements.define("register-form", Register);
