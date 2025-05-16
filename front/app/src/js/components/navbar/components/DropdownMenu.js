import { auth, handleLogout } from '@auth';
import { ThemeController } from '@utils';
import anonymousavatar from '/img/anonymous-avatar.png?url';

export class DropdownMenu extends HTMLElement {
  #state = {
    isLoggedIn: false,
    user: null,
  };

  constructor() {
    super();
    this.handleLogoutClick = this.handleLogoutClick.bind(this);
    this.handleThemeChange = this.handleThemeChange.bind(this);
  }

  async setLoginStatus(value) {
    this.#state.isLoggedIn = value;
    this.#state.user = auth.getStoredUser();
    if (this.#state.isLoggedIn && !this.#state.user) {
      this.#state.user = await auth.getUser();
      if (!this.#state.user) {
        this.#state.isLoggedIn = false;
      }
    }
    this.render();
  }

  disconnectedCallback() {
    this.logoutButton?.removeEventListener('click', this.handleLogoutClick);
    this.themeToggleButton?.removeEventListener('click', this.handleThemeChange);
  }

  render() {
    this.innerHTML = this.template();

    this.avatarImg = this.querySelector('#avatar-img');
    this.avatarImg.src = this.#state.user ? this.#state.user.avatar : `${anonymousavatar}`;

    if (this.#state.isLoggedIn) {
      this.linkToProfile = this.querySelector('#dropdown-item-profile');
      this.linkToProfile.href = `/profile/${this.#state.user.username}`;
    }

    requestAnimationFrame(() => {
      this.themeToggleButton = document.getElementById('theme-toggle');
      this.themeToggleButton.addEventListener('click', this.handleThemeChange);

      if (this.#state.isLoggedIn) {
        this.logoutButton = document.getElementById('dropdown-item-logout');
        this.logoutButton.addEventListener('click', this.handleLogoutClick);
      }
    });
  }

  handleLogoutClick() {
    handleLogout();
  }

  handleThemeChange() {
    const newTheme = ThemeController.toggleTheme();
    const themeLabel = document.getElementById('theme-label');
    if (themeLabel) {
      themeLabel.textContent = newTheme === 'dark' ? 'Light Mode' : 'Dark Mode';
    }
  }

  template() {
    const isDarkMode = ThemeController.getTheme() === 'dark';

    return `
    <div class="nav-link dropdown-toggle" id="navbarDropdown" role="button" data-bs-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
      <img id="avatar-img" alt="user" class="d-inline-block align-top avatar-s rounded-circle">
    </div>
    <div class="dropdown-menu dropdown-menu-end pt-2" aria-labelledby="navbarDropdown">
      ${ this.#state.isLoggedIn ? `
        <a href="/home" class="dropdown-item">Saloon</a>
        <a class="dropdown-item" id="dropdown-item-profile">My profile</a>
        <a href="/settings" class="dropdown-item">Settings</a>
      ` : `
        <a href="/login" class="dropdown-item">Login</a>
        <a href="/register" class="dropdown-item">Sign up</a>
      ` }
      <div class="dropdown-divider"></div>
      <button class="dropdown-item" id="theme-toggle">
        <span id="theme-label">${isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>
      </button>
      ${ this.#state.isLoggedIn ? `
        <div class="dropdown-divider"></div>
        <div class="dropdown-item" id="dropdown-item-logout">Logout</div>
      ` : `` }
    </div>
    `;
  }
}

customElements.define('navbar-dropdown-menu', DropdownMenu);
