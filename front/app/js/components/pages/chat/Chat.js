export class Chat extends HTMLElement {
	constructor() {
		super();
	}

	connectedCallback() {
		this.render();
	}

	render() {
		this.innerHTML = `
		<div class="container d-flex flex-column justify-content-center align-items-center text-center">
			<h1>Chat page</h1>
		</div>
		`;
	}
}

customElements.define('chat-page', Chat);
