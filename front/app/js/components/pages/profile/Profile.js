
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
			const response = await fetch(`/api/users/${userId}/`);  // Appel réel à l'API
			if (!response.ok) {
				throw new Error('User not found');
			}
			const userData = await response.json();
			this.user = userData;
			this.render();
		} catch (error) {
			console.error('Error fetching user data:', error);
			this.innerHTML = `<p>User not found.</p>`;  // Gestion d'erreur
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
			<a class="btn btn-outline-primary" href="/home" role="button">Back to Home</a>
			</div>
		</div>
		`;
	}
}

customElements.define('user-profile', UserProfile);
