import { renderNavbar } from "../shared_components/navbar.js";
import { renderLandingView } from "../shared_components/landing.js";
import { renderUserProfile } from "../user/userProfile.js";

export function simulateLogin(event) {
	event.preventDefault();
	const inputUsername = document.getElementById('inputUsername');
	const inputPassword = document.getElementById('inputPassword');
	
	if (inputUsername.value === 'test' && inputPassword.value === 'password') {
		localStorage.setItem('isLoggedIn', 'true');
		// alert('Login successful');
		renderNavbar();
		renderUserProfile();
	} else {
		alert('Login failed');
	}
}

export function simulateLogout(event) {
	event.preventDefault();
	localStorage.removeItem('isLoggedIn');
	// alert('Logout successful');
	renderNavbar();
	renderLandingView();
}
