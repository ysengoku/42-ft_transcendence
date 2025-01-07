import { renderNavbar } from './shared_components/navbar.js';
import { renderLandingPage } from './shared_components/landing.js';
import { renderLoginForm } from './user/login.js';

document.addEventListener("DOMContentLoaded", function () {
	renderNavbar();
	renderLandingPage();

	document.addEventListener('click', function (event) {
		if (event.target && event.target.matches('a[href="#login"]')) {
			renderLoginForm();
		} else if (event.target && event.target.matches('a[href="#register"]')) {
			renderSignUpForm();
		}
	}); 
});
