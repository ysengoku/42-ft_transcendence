import { Router } from './Router.js';
import './components/pages/Landing.js';
import './components/pages/Login.js';
import './components/navbar/DropdownMenu.js';

const router = new Router();

router.addRoute('/', 'landing-component');
router.addRoute('/login', 'login-form');
router.addRoute('/profile', 'user-profile');  // This is temporary
// router.addRoute('/profile/:id', 'user-profile');
// Add all routes here

document.addEventListener('DOMContentLoaded', () => {
	const navbarDropdown = document.getElementById('user-menu');
	navbarDropdown.innerHTML = '<dropdown-menu></dropdown-menu>';
	router.init();
	router.navigate(window.location.pathname);
});

export { router };
