// import { Router } from './Router.js';
import './components/pages/Landing.js';
import './components/pages/Login.js';
import './components/navbar/DropdownMenu.js';

// const router = new Router();

// router.addRoute('/', 'landing-component'); //Uncaught ReferenceError: isDynamic is not defined
// router.addRoute('/login', 'login-component');

document.addEventListener("DOMContentLoaded", function () {
	const navbarDropdown = document.getElementById('user-menu');
	navbarDropdown.innerHTML = '<dropdown-menu></dropdown-menu>';
	const contentContainer = document.getElementById('content');
	contentContainer.innerHTML = '<landing-component></landing-component>';
	
	// router.navigate();

	document.addEventListener('click', function (event) {
		if (event.target && event.target.matches('a[href="#login"]')) {
			contentContainer.innerHTML = '<login-form></login-form>';
		} else if (event.target && event.target.matches('a[href="/register"]')) {
			renderSignUpForm();
		}
	}); 
});

// 	document.addEventListener('click', function (event) {
// 		const target = event.target;

// 		if (target && target.matches('a[href^="/"]')) {
// 		  const path = target.getAttribute('href');
// 		  event.preventDefault();
// 		  navigateTo(path);
	
// 		  if (routes[path]) {
// 			routes[path]();
// 		  }
// 		}
// 	  }); 
// });