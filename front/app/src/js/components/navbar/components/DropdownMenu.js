import { ThemeController } from '@utils/ThemeController.js';
import { handleLogout } from '@utils/handleLogout.js';
import anonymousavatar from '/img/anonymous-avatar.svg?url'
import { simulateFetchUserData } from '@mock/functions/simulateFetchUserData.js';

export class DropdownMenu extends HTMLElement {
	constructor() {
		super();
	}

	connectedCallback() {
		this.render();
	}

	async render() {
		// Temporary solution with localStorage
		const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
		const isDarkMode = ThemeController.getTheme() === 'dark';
		// const storedUser = localStorage.getItem('user');
		// let username = null;
		// let avatarSrc = `${anonymousavatar}`;
		// if (user) {
		// 	const user = JSON.parse(storedUser);
		// 	username = user.username;
		// 	avatarSrc = `${user.avatar}`;
		// }
		let username = null;
		let avatarSrc = `${anonymousavatar}`;
		const storedUser = localStorage.getItem('user');
		if (storedUser) {
			const user = await simulateFetchUserData('JohnDoe');
			if (user) {
				username = user.username;
				avatarSrc = `${user.avatar}`;
			}
		}

		this.innerHTML = `
		<a class="nav-link dropdown-toggle" href="#" id="navbarDropdown" role="button" data-bs-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
			<img id="avatar-img" src="${avatarSrc}" height="40" alt="user" class="d-inline-block align-top rounded-circle">
		</a>
		<div class="dropdown-menu dropdown-menu-end" aria-labelledby="navbarDropdown">
			${isLoggedIn ? `
				<a class="dropdown-item" href="/profile/${username}">Your profile</a>
				<a class="dropdown-item" href="/settings/${username}">Settings</a>
			` : `
				<a class="dropdown-item" href="/login" id="dropdown-item-login">Login</a>
				<a class="dropdown-item" href="/register" id="dropdown-item-register">Sign up</a>
			`}
			<div class="dropdown-divider"></div>
			<button class="dropdown-item" id="theme-toggle">
				<span id="theme-label">${isDarkMode ? "Light Mode" : "Dark Mode"}</span>
		  	</button>
			${isLoggedIn ? `
				<div class="dropdown-divider"></div>
				<a class="dropdown-item" id="dropdown-item-logout">Logout</a>
			` : ``}
		</div>
		`;

		const themeToggleButton = document.getElementById('theme-toggle');
		themeToggleButton.addEventListener('click', () => {
			const newTheme = ThemeController.toggleTheme();
			const themeLabel = document.getElementById('theme-label');
			if (themeLabel) {
				themeLabel.textContent = newTheme === 'dark' ? 'Light Mode' : 'Dark Mode';
			}
		});

		if (isLoggedIn) {
			document.getElementById('dropdown-item-logout')?.addEventListener('click', handleLogout);
		}
	}
}

customElements.define('dropdown-menu', DropdownMenu);
