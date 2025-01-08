// import { navigateTo } from './router.js';
import { renderNavbar } from './shared_components/navbar.js';
import { renderLandingView } from './shared_components/landing.js';
import { renderLoginForm } from './user/login.js';

document.addEventListener("DOMContentLoaded", function () {
	renderNavbar();
	renderLandingView();

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

	document.addEventListener('click', function (event) {
		if (event.target && event.target.matches('a[href="#login"]')) {
			renderLoginForm();
		} else if (event.target && event.target.matches('a[href="#register"]')) {
			renderSignUpForm();
		}
	}); 
});
