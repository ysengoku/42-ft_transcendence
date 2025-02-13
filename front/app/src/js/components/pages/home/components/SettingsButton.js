import { router } from '@router';

export class SettingsButton extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    this.render();
  }

  render() {
    this.innerHTML = `
        <div id="home-settings-button">
          <div class="btn btn-outline-primary btn-lg">Settings</div>
        </div>
        `;
    const button = this.querySelector('#home-settings-button');
    button.addEventListener('click', (event) => {
      event.preventDefault();
      router.navigate(`/settings`);
    });
  }
}

customElements.define('home-settings-button', SettingsButton);
