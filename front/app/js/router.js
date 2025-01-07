import { renderLandingPage } from './shared_components/landing.js';
import { renderLoginForm } from './user/login.js';
import { renderUserProfile } from './user/userProfile.js';

const routes = {
	'/': renderLandingPage,
	'/login': renderLoginForm,
	'/profile': renderUserProfile
};

export function navigateTo(url) {
	window.history.pushState(null, null, url);
	renderView(url);
}

function renderView(url) {
	const route = routes[url];

	if (route) {
		route();
	} else {
		renderNotFound();
	}
}

function renderNotFound() {
	const contentContainer = document.getElementById('content');
	contentContainer.innerHTML = '<h1>404 Not Found</h1>';
}

export function initRouter() {
	renderView(window.location.pathname);

	window.onpopstate = function () {
		renderView(window.location.pathname);
	};
}