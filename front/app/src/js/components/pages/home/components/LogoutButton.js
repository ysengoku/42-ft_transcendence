import { handleLogout } from '@auth';

export class LogoutButton extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    this.render();
  }

  render() {
    this.innerHTML = `
      <div id="home-logout-button">
        <div class="btn btn-outline-primary btn-lg">Logout</div>
      </div>
      `;
    const button = this.querySelector('#home-logout-button');
    button.addEventListener('click', (event) => {
      event.preventDefault();
      handleLogout();
    });
  }
}

customElements.define('home-logout-button', LogoutButton);
