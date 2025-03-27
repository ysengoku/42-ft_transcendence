import userNotFoundImage from '/img/sample404.png?url';

export class Error extends HTMLElement {
  #state = {
    message: '',
    status: 0,
  };

  constructor() {
    super();
  }

  connectedCallback() {
    this.#state.status = '';
    this.#state.message = 'An error occurred';
    this.render();
  }

  setQueryParam(param) {
    this.#state.message = param.get('error') || 'An error occurred';
    this.#state.status = param.get('code') || '';
    this.render();
  }

  render() {
    this.innerHTML = this.template() + this.style();

    const status = this.querySelector('#error-status');
    const message = this.querySelector('#error-message');
    status.textContent = `Error: ${this.#state.status}`;
    message.textContent = this.#state.message;
  }

  template() {
    return `
      <div class="error-wrapper d-flex flex-row justify-content-center align-items-stretch my-4 py-4 gap-3">
        <div class="image-container mx-2">
        <img src="${userNotFoundImage}" alt="404" class="img-fluid">
        </div>
        <div class="d-flex flex-column justify-content-around" mx-2">
          <div class="pt-6">
            <h2 id="error-status"></h2>
	          <p id="error-message"></p>
          </div>
          <div class="pb-6">
            <a class="btn btn-wood" href="/home" role="button">Go back to Home</a>
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
      .error-wrapper {
        backdrop-filter: blur(4px);
      }
    </style>
      `;
  }
}

customElements.define('error-page', Error);
