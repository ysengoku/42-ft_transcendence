import { handleLogout } from '../../utils/handleLogout.js';

export class DropdownMenu extends HTMLElement {
	constructor() {
		super();
	}

	connectedCallback() {
		this.render();
	}

	render() {
		const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true'; // Simulation using mock

		const avatarSrc = isLoggedIn 
			? `/assets/img/sample_avatar.jpg`
    		: `/assets/img/default_avatar.svg`;
		this.innerHTML = `
		<a class="nav-link dropdown-toggle" href="#" id="navbarDropdown" role="button" data-bs-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
			<img id="avatar-img" src="${avatarSrc}" height="40" alt="user" class="d-inline-block align-top rounded-circle">
		</a>
		<div class="dropdown-menu dropdown-menu-end" aria-labelledby="navbarDropdown">
			${!isLoggedIn ? `
				<a class="dropdown-item" href="/login" id="dropdown-item-login">Login</a>
				<a class="dropdown-item" href="/register" id="dropdown-item-register">Sign up</a>
			` : `
				<a class="dropdown-item" href="/profile">Your profile</a>
				<a class="dropdown-item" href="/setting">Settings</a>
				<div class="dropdown-divider"></div>
				<a class="dropdown-item" id="dropdown-item-logout">Logout</a>
			`}
		</div>
		`;

		// ------- Logout simulation using mock -----------------------------
		if (isLoggedIn) {
			document.getElementById('dropdown-item-logout')?.addEventListener('click', handleLogout);
		}
		// -----------------------------------------------------------------
	}
}

customElements.define('dropdown-menu', DropdownMenu);
