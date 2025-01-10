export class Register extends HTMLElement {
	constructor() {
		super();
	}

	connectedCallback() {
		this.render();
	}

	render() {
		this.innerHTML = `
		<div class="container d-flex flex-column justify-content-center align-items-center text-center">
			<h1>This is Sign up page</h1>
		</div>
		`;
	}
}

customElements.define('register-form', Register);
