// import "../../api/index.js";
import { apiRequest } from "../../api/apiRequest.js"
import { API_ENDPOINTS } from "../../api/endpoints.js";

export class Register extends HTMLElement {
	constructor() {
		super();
	}

	connectedCallback() {
		this.render();
		this.setupRegisterHandler();

		const inputFields = this.querySelectorAll('input');
		inputFields.forEach(field => {
			field.addEventListener('input', () => {
				field.style.borderColor = '';
			} )
		})
	}

	render() {
		this.innerHTML = `
		<div class="container d-flex flex-column justify-content-center align-items-center">
			<form class="w-100">
				  <div class="mb-3">
					<label for="username" class="form-label">Username</label>
					   <input type="username" class="form-control" id="username" placeholder="username">
				  </div>
				<div class="mb-3">
					<label for="email" class="form-label">Email</label>
					<input type="email" class="form-control" id="email" placeholder="email">
				  </div>
				<div class="mb-3">
					<label for="password" class="form-label">Password</label>
					<div class="col-auto">
						<input type="password" class="form-control" id="password" placeholder="password" aria-describedby="passwordHelpInline">
					</div>
					<div class="col-auto">
					    <span id="passwordHelpInline" class="form-text">
      						Add message (error etc)
    					</span>
					</div>
				</div>
				<div class="mb-3">
					<label for="password_repeat" class="form-label">Confirm Password</label>
					<input type="confirmPassword" class="form-control" id="password_repeat" placeholder="password">
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
	  		event.preventDefault();  // Prevent the default behavior of browser (page reload)
	  		this.handleRegister();
		});
	}

	async handleRegister() {
		const usernameField = this.querySelector("#username");
		const emailField = this.querySelector("#email");
		const passwordField = this.querySelector("#password");
		const password_repeatField = this.querySelector("#password_repeat");

		if (!usernameField.value || emailField.value.trim() === "" ||
		passwordField.value.trim() === "" || password_repeatField.value.trim() === "") {
			if (!usernameField.value) this.querySelector("#username").style.borderColor = "red";
			if (!emailField.value) this.querySelector("#email").style.borderColor = "red";
			if (!passwordField.value) this.querySelector("#password").style.borderColor = "red";
			if (!password_repeatField.value) this.querySelector("#password_repeat").style.borderColor = "red";
			return;
		}
		const userData = {
			username: usernameField.value,
			email: emailField.value,
			password: passwordField.value,
			password_repeat: password_repeatField.value
		};

    	try {
        	const response = await apiRequest('POST', API_ENDPOINTS.REGISTER, userData);
        	console.log('Registration successful:', response);
			//----- Temporary ------------------------------------------
			localStorage.setItem('isLoggedIn', 'true');
			localStorage.setItem('user', JSON.stringify(response.user));
			//----------------------------------------------------------
			const navBar = document.getElementById('navbar-container');
			navBar.innerHTML = '<navbar-component></navbar-component>';
			router.navigate(`/home`, response.user);
   		} catch (error) {
        	// Error handling
			console.error('Error registering user:', error);
    	}
	}
}

customElements.define('register-form', Register);
