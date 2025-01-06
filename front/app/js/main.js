// import { renderNavbar } from './shared_components/navbar.js';

document.addEventListener("DOMContentLoaded", function () {
	const app = document.getElementById("app");

	// app.innerHTML = renderNavbar();
	renderLandingPage();

	function renderLandingPage() {
		app.innerHTML = `
		<div class="container">
			<div class="text-center">
			<img src="../assets/img/sample-logo.svg" alt="logo">
		</div>

		<div class="d-flex flex-column align-items-center">
			<div class="mb-3">
				<a class="btn btn-primary" href="#" role="button">Login</a>
			</div>
			<div class="mb-3">
				<a class="btn btn-primary" href="#" role="button">Sign up</a>
			</div>
		</div>
		`;
	}

	function renderMainView() {
		app.innerHTML = `
		<div class="container">
			<div class="text-center">
			<h1>Welcome to the main view</h1>
		</div>
		`;
	}
});


/* <div class="container">
	<div class="text-center">
		<img src="./static/img/sample-logo.svg" alt="logo">
	</div>

	<div class="d-flex flex-column align-items-center">
		<div class="mb-3">
			<a class="btn btn-primary" href="#" role="button">Login</a>
		</div>
		<div class="mb-3">
			<a class="btn btn-primary" href="#" role="button">Sign up</a>
		</div>
	</div>
</div> */