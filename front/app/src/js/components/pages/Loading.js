export class Loading extends HTMLElement {
  #state = {
    ballSpeedX: 4,
    ballSpeedY: 3,
    ballRadius: 12,
    animationFrameId: null,
  };

  constructor() {
    super();
    this.ballColor = getComputedStyle(document.documentElement).getPropertyValue('--pm-primary-400');
  }

  connectedCallback() {
    this.render();
  }

  disconnectedCallback() {
    cancelAnimationFrame(this.#state.animationFrameId);
  }

  render() {
    this.innerHTML = this.template() + this.style();
    this.canvas = document.getElementById('loading-animation-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.resizeCanvas();
    this.drawFrame();
  }

  drawBall() {
    this.ctx.beginPath();
    this.ctx.arc(this.ballX, this.ballY, this.#state.ballRadius, 0, Math.PI * 2);
    this.ctx.fillStyle = this.ballColor;
    this.ctx.fill();
    this.ctx.closePath();
  }

  updateBallPosition() {
    this.ballX += this.#state.ballSpeedX;
    this.ballY += this.#state.ballSpeedY;

    if (this.ballX + this.#state.ballRadius > this.canvas.width || this.ballX - this.#state.ballRadius < 0) {
      this.#state.ballSpeedX = -this.#state.ballSpeedX;
    }
    if (this.ballY + this.#state.ballRadius > this.canvas.height || this.ballY - this.#state.ballRadius < 0) {
      this.#state.ballSpeedY = -this.#state.ballSpeedY;
    }
  }

  drawFrame() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.drawBall();
    // this.drawMessage();
    this.updateBallPosition();
    this.#state.animationFrameId = requestAnimationFrame(() => this.drawFrame());
  }

  resizeCanvas() {
    this.canvas.width = Math.floor(window.innerWidth) * 0.4;
    this.canvas.height = Math.floor(window.innerHeight) * 0.2;
    this.ballX = this.canvas.width / 2;
    this.ballY = this.canvas.height / 2;
  }

  template() {
    return `
    <div class="container d-flex flex-column justify-content-center align-items-center text-center">
      <canvas id="loading-animation-canvas"></canvas>
      <div id="loading-message" class="fs-4 fw-bold">Loading</div>
    </div>
    `;
  }

  style() {
    return `
    <style>
      #loading-message {
        position: absolute;
      }
    </style>
    `;
  }
}

customElements.define('loading-animation', Loading);
