export class FriendsButton extends HTMLElement {
	constructor() {
		super();
	}

	connectedCallback() {
		this.render();
	}

	render() {
		this.innerHTML = `
			<button class="btn btn-secondary me-2 rounded-circle">
				<i class="bi bi-people"></i>
			</button>
		`;

		// Implement modal trigger here
	}
}
customElements.define('friends-button', FriendsButton);
