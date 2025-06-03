export class GameInstruction extends HTMLElement {
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
    <div class="ps-4 pe-3 py-4" id="instruction-wrapper">
      <h6 class="fs-5 mt-2">How to play?</h6>
      <div class="m-0">
        Hit the ball past your opponent to score.<br>
        Move your paddle with <kbd>A</kbd> <kbd>D</kbd> or&nbsp;
        <i class="bi bi-arrow-left-square-fill"></i>
        <i class="bi bi-arrow-right-square-fill"></i>
      </div>
      <h6 class="fs-5 m-0 mt-5 mb-2">With the buffs</h6>
      <div class="m-0">Try to make the bullet hit the coin to obtain buffs and make you win easier!</div>
      </div>
    </div>
    `;
  }

  style() {
    return `
    <style>
    #instruction-wrapper {
      background-color: rgba(var(--bs-body-bg-rgb), 0.3);
      color: rgba(var(--bs-body-color-rgb), 0.8);
      border-radius: 0.2rem;
    }
    kbd {
      display: inline-block;
      border-radius: 0.2rem;
      background-color: rgba(var(--bs-body-color-rgb), 0.8);
      color: rgba(var(--bs-body-bg-rgb), 0.6);
      font-family: "Helvetica Neue", sans-serif;
      font-weight: 600;
      font-size: .5rem;
      vertical-align: middle;
      padding: .15rem .3rem;
    }
    .bi::before {
      vertical-align: -.3em;
    }
    </style>
    `;
  }
}

customElements.define('game-instruction', GameInstruction);
