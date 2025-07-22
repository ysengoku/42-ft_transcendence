import pedro from '/img/pedro.png?url';

export class Error extends HTMLElement {
  #state = {
    message: 'An error occurred',
    status: 0,
  };

  constructor() {
    super();
  }

  connectedCallback() {
    if (!this.#state.status) {
      this.#state.status = '';
    } else if (this.#state.status === '503') {
      this.#state.message = 'Service Unavailable';
    }
    this.render();
  }

  setQueryParam(param) {
    this.#state.message = param.get('error') || 'An error occurred';
    this.#state.status = param.get('code') || '';
  }

  render() {
    this.innerHTML = this.template();

    const status = this.querySelector('#error-status');
    const message = this.querySelector('#error-message');
    status.textContent = `Error: ${this.#state.status}`;
    message.textContent = this.#state.message;
  }

  template() {
    return `
      <div class="error-wrapper d-flex flex-column justify-content-center align-items-center">
        <div class="d-flex flex-row justify-content-center mx-2 mt-5 pt-4 gap-1">
          <div class="d-flex flex-column justify-content-between align-items-center">
            <div class="bubble-error">
              <h2 class="m-0" id="error-status"></h2>
	            <p class="m-0" id="error-message"></p>
            </div>
          </div>
          <div class="image-container mt-5">
            <img src="${pedro}" alt="pedro" class="img-fluid">
          </div>
        </div>
        <div class="d-flex flex-row justify-content-center align-items-center mt-2 mb-4">
          <i class="bi bi-arrow-left fw-bold"></i>
          <a class="btn" href="/home" role="button">Go Back</a>
        </div>
      </div>
	  `;
  }
}

customElements.define('error-page', Error);
