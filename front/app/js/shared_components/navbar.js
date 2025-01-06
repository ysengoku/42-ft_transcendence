function renderNavbar() {
	return `
	<div>
		<header class="navbar navbar-expand navbar-dark bg-dark flex-column flex-md-row bd-navbar">
			<a class="navbar-brand" href="./index.html">
				<img src="./static/img/sample-logo.svg" height="40" alt="transcendencing" class="d-inline-block align-top">
			</a>

			<div class="ml-auto d-flex align-items-center">
				<ul class="navbar-nav mr-auto">
					<li class="nav-item dropdown">
						<a class="nav-link dropdown-toggle" href="#" id="navbarDropdown" role="button" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
							<img id="avatar-img" src="./static/img/default_avatar.svg" height="40" alt="user" class="d-inline-block align-top">
						</a>
						<div class="dropdown-menu dropdown-menu-right" aria-labelledby="navbarDropdown">
							<a class="dropdown-item" href="#" id="dropdown-item-nologged1">Login</a>
							<a class="dropdown-item" href="#" id="dropdown-item-nologged2">Sign up</a>
							<a class="dropdown-item" href="#" id="dropdown-item-logged1">Your profil</a>
							<a class="dropdown-item" href="#" id="dropdown-item-logged2">Setting</a>
							<div class="dropdown-divider"></div>
							<a class="dropdown-item" href="#" id="dropdown-item-nologged3">Forgot password</a>
							<a class="dropdown-item" href="#" id="dropdown-item-logged3">Logout</a>
						</div>
					</li>
				</ul>
			</div>
		</header>
	</div>
	`;
}

export { renderNavbar };
