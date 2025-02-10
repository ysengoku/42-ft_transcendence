import { router } from '@router';
import { auth, handleLogout } from '@auth';
import { ThemeController } from '@utils';
import anonymousavatar from '/img/anonymous-avatar.svg?url';
// import { simulateFetchUserData } from '@mock/functions/simulateFetchUserData.js';

export class DropdownMenu extends HTMLElement {
  constructor() {
    super();
    this.isLoggedIn = false;
    this.user = null;
  }

  // connectedCallback() {
  //   this.render();
  // }

  setLoginStatus(value) {
    this.isLoggedIn = value;
    this.user = auth.getUser();
    this.render();
  }

  render() {
    const isDarkMode = ThemeController.getTheme() === 'dark';
    const avatarSrc = this.user ? this.user.avatar : `${anonymousavatar}`;

    this.innerHTML = `
		<div class="nav-link dropdown-toggle" id="navbarDropdown" role="button" data-bs-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
		  <img id="avatar-img" src="${avatarSrc}" height="40" alt="user" class="d-inline-block align-top rounded-circle">
	  </div>
		<div class="dropdown-menu dropdown-menu-end" aria-labelledby="navbarDropdown">
			${ this.isLoggedIn ? `
				<div class="dropdown-item" id="dropdown-item-profile">Your profile</div>
				<div class="dropdown-item" id="dropdown-item-settings">Settings</div>
			` : `
				<div class="dropdown-item" id="dropdown-item-login">Login</div>
				<div class="dropdown-item" id="dropdown-item-register">Sign up</div>
			` }
			<div class="dropdown-divider"></div>
			<button class="dropdown-item" id="theme-toggle">
				<span id="theme-label">${isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>
		  </button>
			${ this.isLoggedIn ? `
				<div class="dropdown-divider"></div>
				<div class="dropdown-item" id="dropdown-item-logout">Logout</div>
			` : `` }
		</div>
		`;

    const themeToggleButton = document.getElementById('theme-toggle');
    if (themeToggleButton) {
      themeToggleButton.addEventListener('click', () => {
        const newTheme = ThemeController.toggleTheme();
        const themeLabel = document.getElementById('theme-label');
        if (themeLabel) {
          themeLabel.textContent = newTheme === 'dark' ? 'Light Mode' : 'Dark Mode';
        }
      });
    }
    requestAnimationFrame(() => {
      this.setLinks();
      this.setthemeToggleButton();
    });
  }

  setLinks() {
    document.getElementById('dropdown-item-profile')?.addEventListener('click', () => {
      router.navigate(`/profile/${this.user.username}`);
    });
    document.getElementById('dropdown-item-settings')?.addEventListener('click', () => {
      router.navigate('/settings');
    });
    document.getElementById('dropdown-item-login')?.addEventListener('click', () => {
      router.navigate('/login');
    });
    document.getElementById('dropdown-item-register')?.addEventListener('click', () => {
      router.navigate('/register');
    });
    document.getElementById('dropdown-item-logout')?.addEventListener('click', handleLogout);
  }

  setthemeToggleButton() {
    const themeToggleButton = document.getElementById('theme-toggle');
    if (themeToggleButton) {
      themeToggleButton.addEventListener('click', () => {
        const newTheme = ThemeController.toggleTheme();
        const themeLabel = document.getElementById('theme-label');
        if (themeLabel) {
          themeLabel.textContent = newTheme === 'dark' ? 'Light Mode' : 'Dark Mode';
        }
      });
    }
  }
}

customElements.define('navbar-dropdown-menu', DropdownMenu);
