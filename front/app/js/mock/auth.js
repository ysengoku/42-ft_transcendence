import '../components/navbar/DropdownMenu.js';
import '../components/pages/Profile.js';
import '../components/pages/Landing.js';

export function simulateLogin(event) {
	event.preventDefault();
	const inputUsername = document.getElementById('inputUsername');
	const inputPassword = document.getElementById('inputPassword');
	
	if (inputUsername.value === 'test' && inputPassword.value === 'password') {
		localStorage.setItem('isLoggedIn', 'true');
		// alert('Login successful');
		const navbarDropdown = document.getElementById('user-menu');
		navbarDropdown.innerHTML = '<dropdown-menu></dropdown-menu>';
		const contentContainer = document.getElementById('content');
		contentContainer.innerHTML = '<user-profile></user-profile>';
	} else {
		alert('Login failed');
	}
}

export function simulateLogout(event) {
	event.preventDefault();
	localStorage.removeItem('isLoggedIn');
	// alert('Logout successful');
	const navbarDropdown = document.getElementById('user-menu');
	navbarDropdown.innerHTML = '<dropdown-menu></dropdown-menu>';
	const contentContainer = document.getElementById('content');
	contentContainer.innerHTML = '<landing-component></landing-component>';
}
