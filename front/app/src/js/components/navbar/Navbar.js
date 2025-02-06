export class Navbar extends HTMLElement {
  constructor() {
    super();
    this.isLoggedIn = false;
  }

  connectedCallback() {
    // this.checkLoginStatus();
    this.render();
  }

  setLoginStatus(value) {
    this.isLoggedIn = value;
    this.renderNavbarActions();
  }

  // TODO: Implement this method after the endpoint is ready
  checkLoginStatus() {
    // Send request to the server to check if the user is logged in
    // If the user is logged in, set this.isLoggedIn to true
  }

  render() {
    this.innerHTML = `
      <style>
        .navbar {
          background-color: #3b3b3b;
        }
      </style>
			<nav class="navbar navbar-expand navbar-dark px-3">
				<navbar-brand-component></navbar-brand-component>
				<div class="ms-auto d-flex align-items-center" id="navbar-actions-content">
				</div>
			</nav>
		`;

    const navbarBrand = this.querySelector('navbar-brand-component');
    navbarBrand.setLoginStatus(this.isLoggedIn);
    this.renderNavbarActions();
  }

  renderNavbarActions() {
    // const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';  // Temporary solution
    const isLoggedIn = this.isLoggedIn
    const navbarActions = this.querySelector('#navbar-actions-content');
    navbarActions.innerHTML = '';

    if (isLoggedIn) {
      const friendsButton = document.createElement('friends-button');
      const chatButton = document.createElement('chat-button');
      const notificationsButton = document.createElement('notifications-button');

      navbarActions.appendChild(friendsButton);
      navbarActions.appendChild(chatButton);
      navbarActions.appendChild(notificationsButton);
    }

    const dropdownMenu = document.createElement('dropdown-menu');
    dropdownMenu.setLoginStatus(isLoggedIn);
    navbarActions.appendChild(dropdownMenu);
  }
}

customElements.define('navbar-component', Navbar);
