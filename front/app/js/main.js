import { Router } from './Router.js';
import './components/navbar/index.js';
import './components/pages/index.js';
import './components/modals/index.js';

const savedTheme = localStorage.getItem("theme") || "light";
document.documentElement.setAttribute("data-bs-theme", savedTheme);

const router = new Router();

router.addRoute('/', 'landing-component');
router.addRoute('/login', 'login-form');
router.addRoute('/register', 'register-form');
router.addRoute('/home', 'user-home', false, true);
router.addRoute('/profile/:username', 'user-profile', true, true);
router.addRoute('/settings/:username', 'user-settings', true, true);
router.addRoute('/dual-menu', 'dual-menu', false, true);
router.addRoute('/dual/:id', 'dual', true, true);
router.addRoute('/tournament-menu', 'tournament-menu', false, true);
router.addRoute('/tournament/:id', 'tournament', true, true);
// Add all routes here

document.addEventListener('DOMContentLoaded', () => {
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
