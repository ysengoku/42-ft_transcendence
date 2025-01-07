function renderNavbar() {
	return `
		<header class="navbar navbar-expand navbar-dark bg-dark px-3">
			<a class="navbar-brand" href="./index.html">
				<img src="assets/img/sample-logo.svg" height="40" alt="transcendencing" class="d-inline-block align-top">
			</a>

			<div class="ms-auto d-flex align-items-center">
				<ul class="navbar-nav">
					<li class="nav-item dropdown">
						<a class="nav-link dropdown-toggle" href="#" id="navbarDropdown" role="button" data-bs-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
							<img id="avatar-img" src="assets/img/default_avatar.svg" height="40" alt="user" class="d-inline-block align-top">
						</a>
						<div class="dropdown-menu dropdown-menu-end" aria-labelledby="navbarDropdown">
							<a class="dropdown-item" href="#" id="dropdown-item-nologged1">Login</a>
							<a class="dropdown-item" href="#" id="dropdown-item-nologged2">Sign up</a>
							<a class="dropdown-item" href="#" id="dropdown-item-logged1">Your profile</a>
							<a class="dropdown-item" href="#" id="dropdown-item-logged2">Settings</a>
							<div class="dropdown-divider"></div>
							<a class="dropdown-item" href="#" id="dropdown-item-logged3">Logout</a>
						</div>
					</li>
				</ul>
			</div>
		</header>
	`;
}

export { renderNavbar };