// export function renderUserProfile() {
// 	const contentContainer = document.getElementById('content');

// 	const userProfileHTML = `
// 	<div class="container d-flex flex-column justify-content-center align-items-center text-center">
// 		<h1>Your profile</h1>

// 		<div class="mb-3 pt-5">
// 			<a class="btn btn-outline-primary" href="#game" role="button">Go to Game</a>
// 		</div>
// 	</div>
// 	`;
// 	contentContainer.innerHTML = userProfileHTML;
// }

export class UserProfile extends HTMLElement {
	constructor() {
		super();
	}

	connectedCallback() {
		this.render();
	}

	render() {
		this.innerHTML = `
		<div class="container d-flex flex-column justify-content-center align-items-center text-center">
			<h1>This is Profile page</h1>

			<div class="mb-3 pt-5">
				<a class="btn btn-outline-primary" href="#game" role="button">Go to Game</a>
			</div>
		</div>
		`;
	}
}

customElements.define('user-profile', UserProfile);
