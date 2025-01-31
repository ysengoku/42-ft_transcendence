import { router } from '@router';
import '../home/Home.js';
import './components/index.js';

export class Login extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    this.render();
    // this.setupLoginHandler();
  }

  render() {
    const isLoggedIn = localStorage.getItem('isLoggedin') === 'true'; // Temporary solution
    if (isLoggedIn) {
      router.navigate('/home');
    }

    this.innerHTML = `
      <div class="container">
        <div class="row justify-content-center">
          <div class="col-12 col-md-4"> 
			      <login-form></login-form>
			      <div class="container d-flex flex-column justify-content-center align-items-center">
				      <div class="mb-3">
					      <a href="/register" style="text-decoration: none;">Forgot password?</a>
				      </div>
				      <div class="mb-3 w-100 text-center py-3">
      				  <div class="d-flex align-items-center">
        				  <hr class="flex-grow-1">
        				  <span class="mx-2">OR</span>
        				  <hr class="flex-grow-1">
      				  </div>
				      </div>
				      <div class="mb-3">
  					    <a class="btn btn-link w-100 py-2" style="text-decoration: none;" href="/register" role="button">Not registered yet? <strong>Sign up now</strong></a>
				      </div>
			      </div>
			      <oauth-component></oauth-component>
		      </div>
        </div>
      </div>
		`;
  }
}

customElements.define('login-view', Login);
