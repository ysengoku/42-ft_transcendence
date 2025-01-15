import { router } from '../../main.js';
import { simulateFetchUserData } from '../../mock/simulateFetchUserData.js'

export class UserProfile extends HTMLElement {
	constructor() {
		super();
		this.user = null;
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
		if (!this.user) {
            console.log('User data is missing');
            return;
        }

		// Temporary content
		this.innerHTML = `
		<div class="container d-flex flex-column justify-content-center align-items-center text-center">
			<h1>${this.user.name}'s Profile page</h1>
			<p>ID: ${this.user.userid}</p>

    		<div class="d-flex justify-content-center align-items-center profile-avatar-container">
        		<img src="${this.user.avatar}" alt="User Avatar" class="rounded-circle">
    		</div>
			<div class="mb-3 pt-5">
			<a class="btn btn-outline-primary" href="/" role="button">Button</a>
			</div>
		</div>
		`;
	}
}

customElements.define('user-profile', UserProfile);
