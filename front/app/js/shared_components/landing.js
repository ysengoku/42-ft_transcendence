export function renderLandingView() {
	const contentContainer = document.getElementById('content');

	const landingViewHTML = `
	<div class="container d-flex flex-column justify-content-center align-items-center text-center">
		<img src="assets/img/sample-logo.svg" alt="logo" class="img-fluid w-75 mb-2">
		
		<div class="d-flex flex-column align-items-center">
			<div class="mb-3">
				<a class="btn btn-primary btn-lg" href="#login" role="button">Login</a>
			</div>
			<div class="mb-3">
				<a class="btn btn-outline-primary" href="/register" role="button">Sign up</a>
			</div>
		</div>
	</div>
	`;
	contentContainer.innerHTML = landingViewHTML;
}