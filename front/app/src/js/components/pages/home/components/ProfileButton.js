import { router } from '@router';

export class ProfileButton extends HTMLElement {
  constructor() {
    super();
    this.username = '';
  }

  set username(value) {
    this._username = value;
    this.render();
  }

  render() {
    this.innerHTML = `
        <div id="home-profile-button">
          <div class="btn btn-outline-primary btn-lg">My profile</div>
        </div>
        `;
    const button = this.querySelector('#home-profile-button');
    button.addEventListener('click', (event) => {
      event.preventDefault();
      router.navigate(`/profile/${this._username}`);
    });
  }
}

customElements.define('home-profile-button', ProfileButton);
