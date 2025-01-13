export class Setting extends HTMLElement {
	constructor() {
		super();
	}

	setParam(param) {
		const userId = param.id;
		this.fetchUserData(userId);
	}

	render() {

	}
}

customElements.define('user-setting', Setting);
