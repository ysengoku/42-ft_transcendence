export class CreditsAccordion extends HTMLElement {
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
    <div class="accordion accordion-flush" id="accordionCredits">
      <div class="accordion-item">
        <h2 class="accordion-header" onclick="event.stopPropagation();">
          <button class="accordion-button collapsed px-3 py-1" type="button" data-bs-toggle="collapse" data-bs-target="#flush-collapseOne" aria-expanded="false" aria-controls="flush-collapseOne">
            Credits
            <i class="bi bi-info-circle ms-2"></i>
          </button>
        </h2>
        <div id="flush-collapseOne" class="accordion-collapse collapse" data-bs-parent="#accordionCredits">
          <div class="accordion-body">
            <div class="mb-2 fs-6">
              © Peacemakers 2025 
            </div>
            <hr>
            <div>
              Default user avatar image:</br>
              <a href="https://www.freepik.com/" target="_blank">© dgim-studio - Freepik</a>
            </div>
          </div>
        </div>
      </div>
    </div>
    `;
  }

  style() {
    return `
    <style>
    .accordion-button {
      color: rgba(var(--bs-body-color-rgb), 0.7);
      font-family: 'Crimson Pro', serif;
      font-size: 0.8rem;
    }
    .accordion-button::after {
      background-image: none;
    }
    .accordion-body {
      font-size: 0.8rem;
      color: rgba(var(--bs-body-color-rgb), 0.7);
      a {
        color: rgba(var(--bs-body-color-rgb), 0.7);
        text-decoration: none;
      }
    }
    .accordion-button:not(.collapsed) {
      color: var(--bs-body-color) !importtant;
      background-color: var(--bs-body-bg) !important;
    }
    .accordion-button:not(.collapsed)::after {
      background-image: none;
    }
    .accordion-button:focus {
      drop-shadow: none !important;
    }
    </style>
    `;
  }
}

customElements.define('credits-accordion', CreditsAccordion);
