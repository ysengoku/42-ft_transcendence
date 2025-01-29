import userNotFoundImage from '../../../../../public/img/sample404.png';

export class UserNotFound extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
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
	<div class="d-flex flex-row justify-content-center align-items-center gap-3">
	  <div class="image-container mx-2">
	    <img src="${userNotFoundImage}" alt="404" class="img-fluid">
	  </div>
	  <div class="mx-2">
        <h2>Oops!</h2>
        <p>Looks like the user you're searching for doesn't exist.</p>
	</div>
  `;
  }
}

customElements.define('user-not-found', UserNotFound);
