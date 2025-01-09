// import { navigateTo } from './router.js';
import './components/pages/Landing.js';
import './components/pages/Login.js';
import './components/navbar/DropdownMenu.js';

document.addEventListener("DOMContentLoaded", function () {
	const navbarDropdown = document.getElementById('user-menu');
	navbarDropdown.innerHTML = '<dropdown-menu></dropdown-menu>';
	const contentContainer = document.getElementById('content');
	contentContainer.innerHTML = '<landing-component></landing-component>';

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