export class DuelResult extends HTMLElement {
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
		<div class="container d-flex flex-column justify-content-center align-items-center text-center">
      <div class="my-5">--- Show detailed Duel result here ---</div>
			<div class="btn-container d-flex flex-row justify-content-center align-items-center my-5 gap-3">
			</div>
		</div>
		`;
  }
}

customElements.define('duel-result', DuelResult);
