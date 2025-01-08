import { simulateLogout } from '../mock/auth.js';

export function renderNavbar() {
	const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true'; // Simulation using mock

	const userMenuHTML = `
		<a class="nav-link dropdown-toggle" href="#" id="navbarDropdown" role="button" data-bs-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
			<img id="avatar-img" src="${isLoggedIn ? 'assets/img/sample_avatar.jpg' : 'assets/img/default_avatar.svg'}" height="40" alt="user" class="d-inline-block align-top rounded-circle">
		</a>
		<div class="dropdown-menu dropdown-menu-end" aria-labelledby="navbarDropdown">
			${!isLoggedIn ? `
				<a class="dropdown-item" href="#login" id="dropdown-item-login">Login</a>
				<a class="dropdown-item" href="#register" id="dropdown-item-register">Sign up</a>
			` : `
				<a class="dropdown-item" href="/profile">Your profile</a>
				<a class="dropdown-item" href="/">Settings</a>
				<div class="dropdown-divider"></div>
				<a class="dropdown-item" href="/" id="dropdown-item-logout">Logout</a>
			`}
		</div>
	`;

	document.getElementById('user-menu').innerHTML = userMenuHTML;

	// ------- Logout simulation using mock -----------------------------

	if (isLoggedIn) {
		document.getElementById('dropdown-item-logout')?.addEventListener('click', simulateLogout);
	}
	// -----------------------------------------------------------------
}
