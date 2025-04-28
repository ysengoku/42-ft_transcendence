import './components/index.js';

export class TournamentMenu extends HTMLElement {
  #state = {
  };

  constructor() {
    super();
  }

  connectedCallback() {
    this.render();
  }

  render() {
    this.innerHTML = this.template();

    this.createButton = this.querySelector('#create-tournament-button');
    this.list = this.querySelector('tournament-list');
  }

  template() {
    return `
    <div class="container">
      <div class="row justify-content-center py-4">
        <div class="form-container col-12 col-sm-10 col-md-8 col-lg-6 col-xl-5 p-4">
          <div class="d-flex flex-column justify-content-center align-items-center w-100 px-4">
            <h2 class="text-start m-0 py-2 w-100">Tournament</h2>
            <button class="btn d-flex flex-row justify-content-start align-items-center fw-bold w-100 m-0 p-0 mb-3" id="create-tournament-button">
              <i class="bi bi-plus fs-3"></i>
              New Tournament
            </button>

            <div class="pb-4 w-100">
              <tournament-list></tournament-list>
            </div>

            <div class="d-flex flex-row justify-content-center mt-5">
              <a href="/home" class="btn">
                <i class="bi bi-arrow-left"></i>
                Back to home
              </a>
            </div>  
          </div>
        </div>
      </div>
    </div>
		`;
  }
}

customElements.define('tournament-menu', TournamentMenu);
