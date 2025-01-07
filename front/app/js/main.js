import { renderNavbar } from './shared_components/navbar.js';
import { renderLoginForm } from './user/login.js';

document.addEventListener("DOMContentLoaded", function () {
	const app = document.getElementById("app");

	app.innerHTML = renderNavbar();

	const contentContainer = document.createElement('div');
	contentContainer.id = 'content';
	app.appendChild(contentContainer);

	renderLandingPage();

	document.addEventListener('click', function (event) {
		if (event.target && event.target.matches('a[href="#login"]')) {
			renderLoginForm();
		} else if (event.target && event.target.matches('a[href="#register"]')) {
			renderSignUpForm();
		}
	});

	function renderLandingPage() {
		const landingPageHTML = `
		<div class="container vh-100 d-flex flex-column justify-content-center align-items-center text-center">
			<img src="assets/img/sample-logo.svg" alt="logo" class="img-fluid w-75 mb-2">
			
			<div class="d-flex flex-column align-items-center">
				<div class="mb-3">
					<a class="btn btn-primary btn-lg" href="#login" role="button">Login</a>
				</div>
				<div class="mb-3">
					<a class="btn btn-outline-primary" href="#register" role="button">Sign up</a>
				</div>
			</div>
		</div>
		`;
		contentContainer.innerHTML = landingPageHTML;
	}
});
