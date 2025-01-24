export class NotFoundComponent extends HTMLElement {
	constructor() {
		super();
	}

	connectedCallback() {
		this.render();
	}

	render() {
		this.innerHTML = `
		<div class="container d-flex flex-column justify-content-center align-items-center text-center">
			<h1>404 Page not found</h1>
		</div>
		`;
	}
}

customElements.define('not-found', NotFoundComponent);
