import sheriff from '/img/sheriff.png?url';

export class UserStatCard extends HTMLElement {
  #state = {
    title: '',
    value: '',
  };

  constructor() {
    super();
  }

  setParam(param) {
    this.#state.title = param.title;
    this.#state.value = param.value;
    this.render();
  }

  render() {
    this.innerHTML = this.template() + this.style();

    const title = this.querySelector('#stat-card-title');
    const value = this.querySelector('#stat-card-value');
    title.textContent = this.#state.title;
    value.textContent = this.#state.value;
  }

  template() {
    return `
    <div class="stat-card d-flex flex-column justify-content-cernter align-items-center pt-4">
      <small class="no-margin" id="stat-card-title"></small>
      <p class="no-margin fs-5" id="stat-card-value"></p>
    </div>
    
    `;
  }

  style() {
    return `
    <style>
      .stat-card {
        width: 96px;
        height: 96px;
        background-image: url(${sheriff});
        padding: 8px;
        background-size: cover;
        background-position: center;
      }
    </style>
    `;
  }
}

customElements.define('user-stat-card', UserStatCard);
