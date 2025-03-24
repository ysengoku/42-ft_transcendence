export class UserGameResultModal extends HTMLElement {
  #state = {
    type: '',
    // id: '',
  };

  constructor() {
    super();
    this.modal = null;
  }

  showModal(type, id) {
    this.#state.type = type;
    // this.#state.id = id;
    this.render();
    if (this.modal) {
      this.modal.show();
    }
  }

  render() {
    console.log(this.#state.type);
    this.innerHTML = this.template() + this.style();
    this.modal = new bootstrap.Modal(this.querySelector('.modal'));

    const modalBody = this.querySelector('.modal-body');
    const content = document.createElement(`${this.#state.type}-result`);
    modalBody.innerHTML = content.outerHTML;
    modalBody.querySelector('h1').remove();
    modalBody.querySelector('.btn-container').remove();
  }

  template() {
    return `
    <div class="modal fade" id="game-result-modal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body py-4"></div>
        </div>
      </div>
    </div>
    `;
  }

  style() {
    return `
    <style>
      .modal-header {
        border-bottom: none;
      }
    </style>
    `;
  }
}

customElements.define('game-result-modal', UserGameResultModal);
