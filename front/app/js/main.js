import { Router } from './Router.js';
import './components/navbar/index.js';
import './components/pages/index.js';

const router = new Router();

router.addRoute('/', 'landing-component');
router.addRoute('/login', 'login-form');
router.addRoute('/register', 'register-form');
router.addRoute('/home', 'user-home', false, true);
router.addRoute('/profile/:id', 'user-profile', true, true);
router.addRoute('setting/:id', 'user-setting', true, true);
// Add all routes here

document.addEventListener('DOMContentLoaded', () => {
	const navbarDropdown = document.getElementById('user-menu');
	navbarDropdown.innerHTML = '<dropdown-menu></dropdown-menu>';
	const navbarBrand = document.getElementById('navbar-brand-container');
	navbarBrand.innerHTML = '<navbar-brand-component></navbar-brand-component>';
	router.init();
	const currentPath = window.location.pathname || '/';
	router.navigate(currentPath);
});

export { router };
