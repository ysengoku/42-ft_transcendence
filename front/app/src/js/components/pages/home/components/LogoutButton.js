import { handleLogout } from '@auth';

export class LogoutButton extends HTMLElement {
  constructor() {
    super();
    this.handleClick = this.handleClick.bind(this);
  }

  connectedCallback() {
    this.render();
  }

  disconnectedCallback() {
    this.button.removeEventListener('click', this.handleClick);
  }

  render() {
    this.innerHTML = this.template();

    this.button = this.querySelector('#home-logout-button');
    this.button.addEventListener('click', this.handleClick);
  }

  handleClick(event) {
    event.preventDefault();
    handleLogout();
  }

  template() {
    return `
      <div id="home-logout-button">
        <div class="btn btn-outline-primary btn-lg">Logout</div>
      </div>
      `;
  }
}

customElements.define('home-logout-button', LogoutButton);
