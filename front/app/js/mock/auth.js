import { router } from '../main.js'; 
import '../components/navbar/DropdownMenu.js';
import '../components/pages/Profile.js';
import '../components/pages/Landing.js';

export function simulateLogin(event) {
	event.preventDefault();
	const inputUsername = document.getElementById('inputUsername');
	const inputPassword = document.getElementById('inputPassword');
	
	if (inputUsername.value === 'test' && inputPassword.value === 'password') {
		localStorage.setItem('isLoggedIn', 'true');
		const navbarDropdown = document.getElementById('user-menu');
		navbarDropdown.innerHTML = '<dropdown-menu></dropdown-menu>';
		router.navigate('/profile');
	} else {
		alert('Login failed');
	}
}

export function simulateLogout(event) {
	event.preventDefault();
	localStorage.removeItem('isLoggedIn');
	const navbarDropdown = document.getElementById('user-menu');
	navbarDropdown.innerHTML = '<dropdown-menu></dropdown-menu>';
	router.navigate('/');
}
