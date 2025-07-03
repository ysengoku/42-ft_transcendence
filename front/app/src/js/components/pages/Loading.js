/**
 * @module Loading
 * @description Displays a loading animation
 */

export class Loading extends HTMLElement {
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
    <div class="container d-flex flex-column justify-content-center align-items-center text-center">
      <div id="loading-text-container">
        <p class="loading-text">
          <span class="letter">L</span>
          <span class="letter">o</span>
          <span class="letter">a</span>
          <span class="letter">d</span>
          <span class="letter">i</span>
          <span class="letter">n</span>
          <span class="letter">g</span>
        </p>
      </div>
    </div>
    `;
  }

  /**
   * Returns CSS styles
   * - Bouncing ball animation: simulates a ball that travels above the letters in sync with their stretching.
   * - Letter L & I stretch animations: create dynamic scaling effects on specific letters.
   */
  style() {
    return `
    <style>
      #loading-text-container {
        position: absolute;
        top: 55vh;
        span {
          font-family: 'kleader';
          font-size: 24px;
          font-weight: bold;
          color: rgba(var(--pm-gray-100-rgb), 0.6);
        }
      }
      .loading-text {
        position: relative;
        margin: 0;
        white-space: nowrap;
      }
      .loading-text .letter {
        display: inline-block;
        position: relative;
        letter-spacing: 2px;
      }

      /**
       * Bouncing ball keyframes:
       * - At 0% and 100%: the ball is above the letter "i", rotated so its trajectory aligns.
       * - At 50%: the ball moves and drops between letters, simulating a bounce.
       */
      .loading-text::before {
        position: absolute;
        content: '';
        z-index: 1;
        left: 28px; /* Initial x-offset */
        top: 0px; /* Initial y-offset */
        width: 12px;
        height: 12px;
        background: var(--pm-green-300);
        border-radius: 50%;
        animation: bouncingBall 1800ms cubic-bezier(0.25,0.25,0.73,0.73) infinite;
      }
      @keyframes bouncingBall {
        0%, 100% {
          transform: rotate(180deg) translate(-52px, -4px) rotate(-180deg);
        }
        50% {
          transform: rotate(0deg) translate(-28px, 6px) rotate(0deg);
        }
      }

      /**
       * Letter L stretching keyframes:
       * - Creates an elastic stretch and squash effect on the first letter (L).
       */
      .loading-text .letter:nth-child(1) {
        transform-origin: 100% 70%;
        transform: scale(1, 1.6);
        animation: letterLStretch 1800ms cubic-bezier(0.25,0.25,0.75,0.75) infinite;
      }
      @keyframes letterLStretch {
        0%, 45%, 70%, 100% { transform: scaleY(1.6); }
        49% { transform: scaleY(0.2); }
        50% { transform: scaleY(0.3); }
        53% { transform: scaleY(0.5); }
        60% { transform: scaleY(1); }
        68% { transform: scaleY(1.4); }
      }

      /**
       * Letter I stretching keyframes:
       * - Pulses the 5th letter (i) to add rhythm in sync with the bouncing ball.
       */
      .loading-text .letter:nth-child(5) {
        transform-origin: 100% 70%;
        animation: letterIStretch 1800ms cubic-bezier(0.25,0.23,0.73,0.75) infinite;
      }
      @keyframes letterIStretch {
        0%, 100% {
          transform: scale(1, 0.35);
          transform-origin: 100% 75%;
        }
        8%, 28% {
          transform: scale(1, 2.125);
          transform-origin: 100% 67%;
        }
        37% {
          transform: scale(1, 0.875);
          transform-origin: 100% 75%;
        }
        46% {
          transform: scale(1, 1.03);
          transform-origin: 100% 75%;
        }
        50%, 97% {
          transform: scale(1);
          transform-origin: 100% 75%;
        }
      }
    </style>
    `;
  }
}

customElements.define('loading-animation', Loading);
