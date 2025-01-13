import { router } from '../main.js'; 
import '../components/navbar/DropdownMenu.js';

export function handleLogout(event) {
	event.preventDefault();
	localStorage.removeItem('isLoggedIn');
	localStorage.removeItem('user');
	const navbarDropdown = document.getElementById('user-menu');
	navbarDropdown.innerHTML = '<dropdown-menu></dropdown-menu>';
	router.navigate('/');
}
