export class TournamentResult extends HTMLElement {
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
			<h1>Tournament Result</h1>
      <div class="my-5">--- Show detailed Tournament result here ---</div>
			<div class="btn-container d-flex flex-row justify-content-center align-items-center my-5 gap-3">
        <a class="btn btn-wood" href="/home" role="button">Go to Home</a>
        <a class="btn btn-wood" role="button">Go to Profile</a>
			</div>
		</div>
		`;
  }
}

customElements.define('tournament-result', TournamentResult);
