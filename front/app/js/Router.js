import { renderUserProfile } from './components/pages/Profile.js';

const routes = {
	'/': renderLandingView,
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