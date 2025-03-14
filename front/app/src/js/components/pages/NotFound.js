import userNotFoundImage from '/img/sample404.png?url';

export class NotFoundPage extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    this.render();
  }

  render() {
    this.innerHTML = this.template() + this.style();
  }

  template() {
    return `
		  <div class="d-flex flex-row justify-content-center align-items-stretch my-4 py-4 gap-3">
        <div class="image-container mx-2">
        <img src="${userNotFoundImage}" alt="404" class="img-fluid">
        </div>
        <div class="d-flex flex-column justify-content-around" mx-2">
          <div class="pt-6">
            <h2>Oops!</h2>
            <p>This page doesn't exist.</p>
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

customElements.define('page-not-found', NotFoundPage);
