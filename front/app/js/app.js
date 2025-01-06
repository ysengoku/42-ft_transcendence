document.addEventListener("DOMContentLoaded", function () {
	const app = document.getElementById("app");

	renderLandingPage();

	function renderLandingPage() {
		app.innerHTML = 
		<><div>
			<h1>Welcome</h1>
			<p>This is landing page</p>
			<button>Login</button>
		</div></>;
 }

});


{/* <div class="container">
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
</div> */}