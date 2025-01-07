import { simulateLogout } from '../mock/auth.js';

export function renderNavbar() {
	const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true'; // Simulation using mock

	const navbarHTML = `
		<header class="navbar navbar-expand navbar-dark bg-dark px-3">
			<a class="navbar-brand" href="./index.html">
				<img src="assets/img/sample-logo.svg" height="40" alt="transcendencing" class="d-inline-block align-top">
			</a>

			<div class="ms-auto d-flex align-items-center">
				<ul class="navbar-nav">
					<li class="nav-item dropdown">
					<a class="nav-link dropdown-toggle" href="#" id="navbarDropdown" role="button" data-bs-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
							${!isLoggedIn ? `
							<img id="avatar-img" src="assets/img/default_avatar.svg" height="40" alt="user" class="d-inline-block align-top">
							` : `
							<img id="avatar-img" src="assets/img/sample_avatar.svg" height="40" alt="user" class="d-inline-block align-top">
							`}
						</a>
						<div class="dropdown-menu dropdown-menu-end" aria-labelledby="navbarDropdown">
            	${!isLoggedIn ? `
                <a class="dropdown-item" href="#login" id="dropdown-item-login">Login</a>
                <a class="dropdown-item" href="#register" id="dropdown-item-register">Sign up</a>
            	` : `
                <a class="dropdown-item" href="#">Your profile</a>
                <a class="dropdown-item" href="#">Settings</a>
                <div class="dropdown-divider"></div>
                <a class="dropdown-item" href="#" id="dropdown-item-logout">Logout</a>
            	`}
						</div>
					</li>
				</ul>
			</div>
		</header>
	`;

	const header = document.querySelector('#app > header');
	header.innerHTML = navbarHTML;

	// ------- Logout simulation using mock -----------------------------
	if (isLoggedIn) {
		const logoutBtn = document.getElementById('dropdown-item-logout');
		if (logoutBtn) {
			logoutBtn.addEventListener('click', simulateLogout);
		}
	}
	// -----------------------------------------------------------------
}
