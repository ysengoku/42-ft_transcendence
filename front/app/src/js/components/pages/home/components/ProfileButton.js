import { router } from '@router';

export class ProfileButton extends HTMLElement {
  #state = {
    username: '',
  };

  constructor() {
    super();
    this.handleClick = this.handleClick.bind(this);
  }

  set username(value) {
    this.#state.username = value;
    this.render();
  }

  disconnectedCallback() {
    this.button.removeEventListener('click', this.handleClick);
  }

  render() {
    this.innerHTML = this.template();

    this.button = this.querySelector('#home-profile-button');
    this.button.addEventListener('click', this.handleClick);
  }

  handleClick(event) {
    event.preventDefault();
    router.navigate(`/profile/${this.#state.username}`);
  }

  template() {
    return `
    <div id="home-profile-button">
      <div class="btn btn-wood btn-lg">My profile</div>
    </div>
    `;
  }
}

customElements.define('home-profile-button', ProfileButton);
