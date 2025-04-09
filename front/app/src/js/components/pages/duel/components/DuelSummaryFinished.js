export class DuelSummaryFinished extends HTMLElement {
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
	  `;
  }
}

customElements.define('duel-summary-finished', DuelSummaryFinished);
