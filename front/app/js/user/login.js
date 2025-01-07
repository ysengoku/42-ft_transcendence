function renderLoginForm() {
	const loginFormHTML = `
	<div class="container vh-100 d-flex flex-column justify-content-center align-items-center">
		<form class="w-25">
  			<div class="mb-3">
    			<label for="inputUsername" class="form-label">Username</label>
   				<input type="username" class="form-control" id="inputUsername">
  			</div>
			<div class="mb-3">
				<label for="inputPassword" class="form-label">Password</label>
    			<input type="password" class="form-control" id="inputPassword">
  			</div>
			<div class="mb-3 py-3">
				<button type="submit" class="btn btn-primary btn-lg w-100 pt-50">Login</button>
			</div>
			<div class="mb-3">
				<a href="#register" style="text-decoration: none;">Forgot password?</a>
			</div>
			<div class="mb-3 text-center py-3">
      			<div class="d-flex align-items-center">
        			<hr class="flex-grow-1">
        			<span class="mx-2">OR</span>
        			<hr class="flex-grow-1">
      			</div>
			</div>
			<div class="mb-3">
  				<button class="btn btn-link w-100 py-2" style="text-decoration: none;" onclick="window.location.href='#register';">Not registered yet? <strong>Sign up now</strong></button>
			</div>
			<div class="mb-3">
  				<button class="btn btn-outline-primary w-100 py-2 my-2" onclick="window.location.href='#';">Login with 42</button>
			</div>
		</form>
	</div>
	`;

	const contentContainer = document.getElementById('content');
	contentContainer.innerHTML = loginFormHTML;
}

export { renderLoginForm };
