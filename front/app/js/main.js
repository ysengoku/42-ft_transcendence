import { Router } from './Router.js';
import './components/pages/Landing.js';
import './components/pages/Login.js';
import './components/pages/Register.js';
import './components/pages/Profile.js'
import './components/navbar/DropdownMenu.js';

const router = new Router();

router.addRoute('/', 'landing-component');
router.addRoute('/login', 'login-form');
router.addRoute('/register', 'register-form');
router.addRoute('/home', 'user-home', true);
router.addRoute('/profile/:id', 'user-profile', true);
// Add all routes here

document.addEventListener('DOMContentLoaded', () => {
	const navbarDropdown = document.getElementById('user-menu');
	navbarDropdown.innerHTML = '<dropdown-menu></dropdown-menu>';
	router.init();
	router.navigate(window.location.pathname);
});

export { router };
