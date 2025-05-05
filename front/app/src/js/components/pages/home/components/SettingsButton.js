import { router } from '@router';

export class SettingsButton extends HTMLElement {
  constructor() {
    super();
    this.handleClicked = this.handleClick.bind(this);
  }

  connectedCallback() {
    this.render();
  }

  disconnectedCallback() {
    this.button.removeEventListener('click', this.handleClick);
  }

  render() {
    this.innerHTML = this.template();

    this.button = this.querySelector('#home-settings-button');
    this.button.addEventListener('click', this.handleClick);
  }

  handleClick(event) {
    event.preventDefault();
    router.navigate('/settings');
  }

  template() {
    return `
      <div id="home-settings-button">
        <div class="btn home-btn-s">Settings</div>
      </div>
    `;
  }
}

customElements.define('home-settings-button', SettingsButton);
