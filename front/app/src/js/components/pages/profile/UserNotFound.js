import { router } from '@router';
import { auth } from '@auth';
import { showAlertMessage, ALERT_TYPE, ERROR_MESSAGES } from '@utils';
import userNotFoundImage from '/img/sample404.png?url';

export class UserNotFound extends HTMLElement {
  #state = {
    isLoggedIn: false,
  };

  constructor() {
    super();
  }

  async connectedCallback() {
    this.#state.isLoggedIn = auth.getStoredUser() ? true : false;
    if (!this.#state.isLoggedIn) {
      showAlertMessage(ALERT_TYPE.ERROR, ERROR_MESSAGES.SESSION_EXPIRED);
      router.navigate('/');
      return;
    }
    this.render();
  }

  render() {
    this.innerHTML = this.template() + this.style();
  }

  template() {
    return `
	  <div class="d-flex flex-row justify-content-center align-items-stretch my-4 gap-3">
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

  style() {
    return `
    <style>
	    h2 {
		    font-size: 2.5rem;
	    }
	    .image-container {
	      width: 300px;
		    height: auto;
      }
    </style>
    `;
  }
}

customElements.define('user-not-found', UserNotFound);
