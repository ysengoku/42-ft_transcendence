import { Router } from './Router.js';
import './components/navbar/index.js';
import './components/pages/index.js';

const savedTheme = localStorage.getItem("theme") || "light";
document.documentElement.setAttribute("data-bs-theme", savedTheme);

const router = new Router();

router.addRoute('/', 'landing-component');
router.addRoute('/login', 'login-form');
router.addRoute('/register', 'register-form');
router.addRoute('/home', 'user-home', false, true);
router.addRoute('/profile/:id', 'user-profile', true, true);
router.addRoute('setting/:id', 'user-setting', true, true);
// Add all routes here

document.addEventListener('DOMContentLoaded', () => {
	// const navbarDropdown = document.getElementById('user-menu');
	// navbarDropdown.innerHTML = '<dropdown-menu></dropdown-menu>';
	// const navbarBrand = document.getElementById('navbar-brand-container');
	// navbarBrand.innerHTML = '<navbar-brand-component></navbar-brand-component>';
	const navbarContainer = document.getElementById('navbar-container');
	if (navbarContainer) {
		navbarContainer.innerHTML = '<navbar-component></navbar-component>';
	} else {
		console.log('Error');
	}
	router.init();
	const currentPath = window.location.pathname || '/';
	router.navigate(currentPath);
});

export { router };
