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

  connectedCallback() {
    this.#state.username = this.getAttribute('username');
    this.#state.nickname = this.getAttribute('nickname');
    this.#state.avatar = this.getAttribute('avatar');
    this.#state.online = this.getAttribute('online') === 'true';
  
    this.render();
  }

  disconnectedCallback() {
    this.removeEventListener('click', this.handleClick);
  }

  render() {
    this.innerHTML = this.template() + this.style();

    const avatar = this.querySelector('.user-list-avatar');
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

  updateOnlineStatus() {
  }
  
  template() {
    return`
		<li class="list-group-item user-list-item">
      <div class="d-flex flex-row align-items-center">
			  <div class="avatar-container">
				  <img class="user-list-avatar rounded-circle me-3" alt="Avatar">
				  <span class="user-list-status-indicator ${this.#state.online ? 'online' : ''} ms-3"></span>
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
      .user-list-item {
        border: none;
        padding: 16px 32px;
        border-bottom: 1px solid var(--bs-border-color);
        position: relative;
      }
      user-list-item:last-of-type .user-list-item {
        border-bottom: none;
        padding-bottom: 8px;
      }
      .avatar-container {
        position: relative;
        display: inline-block;
        margin-right: 10px;
      }
      .user-list-avatar {
        width: 56px;
        height: 56px;
        object-fit: cover;
      }
      .user-list-status-indicator {
        position: absolute;
        width: 16px;
        height: 16px;
        bottom: 0;
        right: 16%;
        border-radius: 50%;
        background-color: gray;
        border: 2px solid var(--bs-body-bg);
      }
      .user-list-status-indicator.online {
        background-color: green;
      }
    </style>
    `;
  }
}

customElements.define('user-list-item', UserListItem);
