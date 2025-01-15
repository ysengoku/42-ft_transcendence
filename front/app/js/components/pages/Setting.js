import { simulateFetchUserData } from '../../mock/simulateFetchUserData.js'

export class Setting extends HTMLElement {
	constructor() {
		super();
	}

	setParam(param) {
		const userId = param.id;
		this.fetchUserData(userId);
	}

	async fetchUserData(userId) {
    	try {
      		const userData = await simulateFetchUserData(userId);
      		this.user = userData;
      		this.render();
    	} catch (error) {
      		console.error('Error fetching user data:', error);
			// Show "User not exists Page"?
    	}
  	}

	render() {
		this.innerHTML = `
		<div class="container d-flex flex-column justify-content-center align-items-center text-center">
			<h1>This is Setting page</h1>
			<p>Name: ${this.user.name}</p>
			<p>ID: ${this.user.userid}</p>

    		<div class="d-flex justify-content-center align-items-center profile-avatar-container">
        		<img src="${this.user.avatar}" alt="User Avatar" class="rounded-circle">
    		</div>
			<div class="mb-3 pt-5">
				<a class="btn btn-primary" href="/home" role="button">Back to Home</a>
			</div>
		</div>
		`;
	}
}

customElements.define('user-setting', Setting);
