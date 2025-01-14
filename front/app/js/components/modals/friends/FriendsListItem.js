export class FriendsListItem extends HTMLElement {
	constructor() {
		super();
		this.name = '';
		this.avatar = '';
		this.online = false;
	}

	static get observedAttributes() {
		return ['name', 'avatar', 'online'];
	}

	attributeChangedCallback(name, oldValue, newValue) {
		if (name === 'name') {
			this.name = newValue;
		} else if (name === 'avatar') {
			this.avatar = newValue;
		} else if (name === 'online') {
			this.online = newValue === 'true';
		}
		this.render();
	}

	connectedCallback() {
		this.render();
	}

	render() {
		this.innerHTML = `
		<li class="list-group-item d-flex align-items-center" id="friends-list-item">
			<img src="${this.avatar}" alt="Avatar" class="rounded-circle me-3" id="friends-list-avatar">
			${this.name}
			<span class="status-indicator ${this.online ? 'online' : ''} ms-3"></span>
		</li>
	`;
	}
}

customElements.define('friends-list-item', FriendsListItem);
