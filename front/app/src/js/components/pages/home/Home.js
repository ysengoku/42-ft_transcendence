import { router } from '@router';
import { auth } from '@auth';

export class Home extends HTMLElement {
  constructor() {
    super();
    this.isLoggedIn = false;
    this.user = null;
  }

  async connectedCallback() {
    // const authStatus = await auth.fetchAuthStatus();
    // this.isLoggedIn = authStatus.success;
    this.user = auth.getCashedUser();
    this.isLoggedIn = this.user ? true : false;
    this.render();
  }

  render() {
    if (!this.isLoggedIn) {
      // TODO: Show message to login
      router.navigate('/');
      return;
    }

    // Temporary content
    this.innerHTML = `
		<div class="container d-flex flex-column justify-content-center align-items-center text-center">
			<h1>Welcome, ${this.user.username}</h1>
			<p>This is futur Home  ("hub?")</p>
			<div class="d-flex flex-column justify-content-center align-items-center grid gap-4 row-gap-4">
				<a class="btn btn-primary btn-lg" href="/dual-menu" role="button">Dual</a>
				<a class="btn btn-primary btn-lg" href="/tournament-menu" role="button">Tournament</a>
				<div class="btn-group d-flex justify-content-center grid gap-4">
					<a class="btn btn-outline-primary" href="/profile/${this.user.username}" role="button">Profile</a>
					<a class="btn btn-outline-primary" href="/settings" role="button">Setting</a>
				</div>
			</div>
		</div>
		`;
  }
}

customElements.define('user-home', Home);
