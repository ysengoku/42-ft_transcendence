export class LocalGameMenu extends HTMLElement {
  #state = {

  };

  constructor() {
    super();
  }

  connectedCallback() {
    this.render();
  }

  disconnectedCallback() {
  }

  render() {
    this.innerHTML = this.template() + this.style();
  }

  template() {
    return `
    <div class="container">
      <div class="row justify-content-center py-4">
        <div class="form-container col-12 col-sm-10 col-md-8 col-lg-6 col-xl-5 p-4">
          <div class="d-flex flex-column justify-content-center align-items-center w-100">
            <h2 class="text-start m-0pt-2 w-75">Local Game</h2>
            <form class="w-75">
              <p class="fs-5 fw-bolder m-0 mb-3">Options</p>
              <button type="submit" id="local-game-classic" class="btn btn-wood btn-lg my-2 w-100">Classic local game</button>
              <button type="submit" id="local-game-ai" class="btn btn-wood btn-lg my-2 w-100">Play against AI</button>
            </form>
          </div>
        </div>
      </div>
    </div>
  `;
  }

  style() {
    return ``;
  }
}

customElements.define('local-game-menu', LocalGameMenu);
