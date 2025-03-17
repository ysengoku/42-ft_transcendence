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
    <div class="stat-card d-flex flex-column justify-content-around align-items-center mx-4 my-5 py-4">
      <p class="stat-label m-0" id="stat-card-title"></p>
      <p class="m-0 fs-2" id="stat-card-value"></p>
    </div>
    
    `;
  }

  style() {
    return `
    <style>
      .stat-card {
        width: 120px;
        height: 120px;
        background-image: url(${sheriff});
        background-size: cover;
        background-position: center;
      }
    </style>
    `;
  }
}

customElements.define('user-stat-card', UserStatCard);
