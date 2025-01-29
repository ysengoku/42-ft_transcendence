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
		<li class="list-group-item friends-list-item">
			<div class="avatar-container">
				<img src="${this.avatar}" alt="Avatar" class="rounded-circle me-3 friends-list-avatar">
				<span class="status-indicator ${this.online ? 'online' : ''} ms-3"></span>
			</div>
			${this.username}
		</li>
	`;
  }
}

customElements.define('friends-list-item', FriendsListItem);
