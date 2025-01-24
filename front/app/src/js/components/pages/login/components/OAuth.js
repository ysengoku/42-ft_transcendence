export class OAuth extends HTMLElement {
	constructor() {
		super();
	}

	connectedCallback() {
		this.render();
		// set up handler
	}

	render() {
		this.innerHTML = `
		<div class='container d-flex flex-column justify-content-center align-items-center'>
			<div class="mb-3 w-100">
  				<a class="btn btn-outline-primary w-100 py-2 my-2">Login with 42</a>
			</div>
		</div>
		`;
  	}
}

customElements.define('oauth-component', OAuth);
