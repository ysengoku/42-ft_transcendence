export class Setting extends HTMLElement {
	constructor() {
		super();
	}

	connectedCallback() {
		this.render();
	}

	render() {

	}
}

customElements.define('setting-component', Setting);
