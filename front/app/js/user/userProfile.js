export function renderUserProfile() {
	const contentContainer = document.getElementById('content');

	const userProfileHTML = `
	<div class="container d-flex flex-column justify-content-center align-items-center text-center">
		<h1>Your profile</h1>

		<div class="mb-3 pt-5">
			<a class="btn btn-outline-primary" href="#game" role="button">Go to Game</a>
		</div>
	</div>
	`;
	contentContainer.innerHTML = userProfileHTML;
}
