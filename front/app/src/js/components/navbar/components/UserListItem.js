import { router } from '@router';

export class UserListItem extends HTMLElement {
  #state = {
    username: '',
    nickname: '',
    avatar: '',
    online: false,
  };

  constructor() {
    super();
    this.handleClick = this.handleClick.bind(this);
  }

  set data(data) {
    this.#state.username = data.username;
    this.#state.nickname = data.nickname;
    this.#state.avatar = data.avatar;
    this.#state.online = data.is_online;
    this.render();
  }

  disconnectedCallback() {
    this.removeEventListener('click', this.handleClick);
  }

  render() {
    this.innerHTML = this.template() + this.style();

    const avatar = this.querySelector('.dropdown-list-avatar');
    avatar.src = this.#state.avatar;
    const nickname = this.querySelector('.userlist-nickname');
    nickname.textContent = this.#state.nickname;
    const username = this.querySelector('.userlist-username');
    username.textContent = `@${this.#state.username}`;

    this.addEventListener('click', this.handleClick);
  }

  handleClick() {
    router.navigate(`/profile/${this.#state.username}`);
  }

  static get observedAttributes() {
    return ['online'];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'online') {
      this.#state.online = newValue === 'true';
      this.updateOnlineStatus();
    }
  }

  updateOnlineStatus() {}

  template() {
    return `
  	<li class="list-group-item dropdown-list-item">
      <div class="d-flex flex-row align-items-center">
  		  <div class="d-inline-block position-relative me-2">
  			  <img class="dropdown-list-avatar avatar-m rounded-circle me-3" alt="Avatar">
  			  <span class="online-status user-list-status-indicator ${this.#state.online ? 'online' : ''} ms-3"></span>
  		  </div>
        <div class="d-flex flex-column justify-content-center">
          <p class="userlist-nickname m-0 fs-5"></P>
  		    <p class="userlist-username m-0 fw-light"></p>
        </div>
      <div>
  	</li>
  `;
  }

  style() {
    return `
    <style>
    .user-list-status-indicator {
      position: absolute;
      bottom: 0;
      right: 16%;
      border: 2px solid var(--bs-body-bg);
    }
    </style>
    `;
  }
}

customElements.define('user-list-item', UserListItem);
