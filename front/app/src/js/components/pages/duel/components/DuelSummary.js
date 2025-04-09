export class DuelSummary extends HTMLElement {
  #state = {
    data: null,
  };

  constructor() {
    super();
  }

  setData(data) {
    this.#state.data = data;
    this.render();
  }

  render() {
    this.innerHTML = this.template() + this.style();
  }

  template() {
    return `
	`;
  }

  style() {
    return `
	<div class="d-flex flex-row gap-3">
	  <div class="d-flex flex-column" id="duel-player1">
	  </div>
      <div class="fs-3 fw-bolder">VS</div>
	  <div>
	  </div>

	</div>
	`;
  }

  style() {
    return `
	`;
  }
}

customElements.define('duel-summary', DuelSummary);
