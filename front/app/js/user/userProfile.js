export function renderUserProfile() {
	const contentContainer = document.getElementById('content');

	const userProfileHTML = `
	<div class="container d-flex flex-column justify-content-center align-items-center text-center">
		<h1>Your profile</h1>
	</div>
	`;
	contentContainer.innerHTML = userProfileHTML;
}
