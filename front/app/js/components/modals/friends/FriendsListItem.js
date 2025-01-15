export class FriendsListItem extends HTMLElement {
	constructor() {
		super();
		this.userid = '';
		this.name = '';
		this.avatar = '';
		this.online = false;
	}

	static get observedAttributes() {
		return ['userid', 'name', 'avatar', 'online'];
	}

	attributeChangedCallback(name, oldValue, newValue) {
		if (name === 'userid') {
			this.userid = newValue;
		} else if (name === 'name') {
			this.name = newValue;
		} else if (name === 'avatar') {
			this.avatar = newValue;
		} else if (name === 'online') {
			this.online = newValue === 'true';
		}
		this.render();
		this.addEventListener('click', () => {
			const modal = document.querySelector('#friendsModal');
			modal.setAttribute('data-bs-dismiss', 'modal');
			window.location.href = `/profile/${this.userid}`;
		});
	}

	connectedCallback() {
		this.render();
		this.addEventListener('click', () => {
			const modal = document.querySelector('#friendsModal');
			modal.setAttribute('data-bs-dismiss', 'modal');
			window.location.href = `/profile/${this.userid}`;
		});
	}

	render() {
		this.innerHTML = `
		<li class="list-group-item friends-list-item">
			<div class="avatar-container">
				<img src="${this.avatar}" alt="Avatar" class="rounded-circle me-3 friends-list-avatar">
				<span class="status-indicator ${this.online ? 'online' : ''} ms-3"></span>
			</div>
			${this.name}
		</li>
	`;
	}
}

customElements.define('friends-list-item', FriendsListItem);
