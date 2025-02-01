export class FriendsListItem extends HTMLElement {
  constructor() {
    super();
    this.username = '';
    this.avatar = '';
    this.online = false;
  }

  static get observedAttributes() {
    return ['username', 'avatar', 'online'];
  }

  attributeChangedCallback(username, oldValue, newValue) {
    if (username === 'username') {
      this.username = newValue;
    } else if (username === 'avatar') {
      this.avatar = newValue;
    } else if (username === 'online') {
      this.online = newValue === 'true';
    }
    this.render();
    this.addEventListener('click', () => {
      const modal = document.querySelector('#friendsModal');
      modal.setAttribute('data-bs-dismiss', 'modal');
      window.location.href = `/profile/${this.username}`;
    });
  }

  connectedCallback() {
    this.render();
    this.addEventListener('click', () => {
      const modal = document.querySelector('#friendsModal');
      modal.setAttribute('data-bs-dismiss', 'modal');
      window.location.href = `/profile/${this.username}`;
    });
  }

  render() {
    this.innerHTML = `
    <style>
      .friends-list-item {
        border: none;
        padding: 16px 32px;
        border-bottom: 1px solid var(--bs-border-color);
        position: relative;
      }
      friends-list-item:last-of-type .friends-list-item {
        border-bottom: none;
        padding-bottom: 8px;
      }
      .avatar-container {
        position: relative;
        display: inline-block;
        margin-right: 10px;
      }
      .friends-list-avatar {
        width: 56px;
        height: 56px;
        object-fit: cover;
      }
      .friends-list-status-indicator {
        position: absolute;
        width: 16px;
        height: 16px;
        bottom: 0;
        right: 16%;
        border-radius: 50%;
        background-color: gray;
        border: 2px solid var(--bs-body-bg);
      }
      .friends-list-status-indicator.online {
        background-color: green;
      }
    </style>
		<li class="list-group-item friends-list-item">
			<div class="avatar-container">
				<img src="${this.avatar}" alt="Avatar" class="rounded-circle me-3 friends-list-avatar">
				<span class="friends-list-status-indicator ${this.online ? 'online' : ''} ms-3"></span>
			</div>
			${this.username}
		</li>
	`;
  }
}

customElements.define('friends-list-item', FriendsListItem);
