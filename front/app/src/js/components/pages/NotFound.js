import pedro from '/img/pedro.png?url';

export class NotFoundPage extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    this.render();
  }

  render() {
    this.innerHTML = this.template();
  }

  template() {
    return `
    <div class="error-wrapper d-flex flex-column justify-content-center align-items-center">
      <div class="d-flex flex-row justify-content-center align-items-stretch mx-2 mt-5 pt-5 gap-1">
        <div class="d-flex flex-column justify-content-between align-items-center">
          <div class="bubble-error">
            <h2 class="m-0">Hmm…</h2>
            <p class="m-0">The page you seek has vanished or was never real.</p>
          </div>
        </div>
        <div class="image-container mt-5">
          <img src="${pedro}" alt="404" class="img-fluid">
        </div>
      </div>
      <div class="d-flex flex-row justify-content-center align-items-center mt-2 mb-4">
        <i class="bi bi-arrow-left fw-bold"></i>
        <a class="btn m-0 fw-bold" href="/home" role="button">Go back to Home</a>
      </div>
      </div>
    `;
  }
}

customElements.define('page-not-found', NotFoundPage);
