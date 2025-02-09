import { auth } from '@auth';
import userNotFoundImage from '../../../../../public/img/sample404.png';

export class UserNotFound extends HTMLElement {
  constructor() {
    super();
    this.isLoggedIn = false;
  }

  async connectedCallback() {
    this.isLoggedIn = await auth.fetchAuthStatus();
    if (!this.isLoggedIn) {
      // TODO: Show message to login
      router.navigate('/');
      return;
    }
    this.render();
  }

  render() {
    this.innerHTML = `
    <style>
	  h2 {
		font-size: 2.5rem;
	  }
	  .image-container {
	    width: 300px;
		  height: auto;
    }
    </style>
	  <div class="d-flex flex-row justify-content-center align-items-stretch gap-3">
	    <div class="image-container mx-2">
	    <img src="${userNotFoundImage}" alt="404" class="img-fluid">
	    </div>
	    <div class="d-flex flex-column justify-content-around" mx-2">
        <div class="pt-6">
          <h2>Oops!</h2>
          <p>Looks like the user you're searching for doesn't exist.</p>
        </div>
        <div class="pb-6">
          <a class="btn btn-primary" href="/home" role="button">Go back to Home</a>
        </div>
      </div>
	  </div>
  `;
  }
}

customElements.define('user-not-found', UserNotFound);
