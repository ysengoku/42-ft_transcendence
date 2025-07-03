export function createClouds() {
  const cloud = document.createElement('div');
  cloud.id = 'cloud';
  document.body.appendChild(cloud);
}

export function createStars() {
  const starContainer = document.createElement('div');
  starContainer.id = 'stars';

  const createStar = () => {
    const star = document.createElement('span');
    star.className = 'star';
    const minSize = 1;
    const maxSize = 3;
    const size = Math.random() * (maxSize - minSize) + minSize;
    star.style.height = `${size}px`;
    star.style.width = `${size}px`;
    star.style.left = `${Math.random() * 100}%`;
    star.style.top = `${Math.random() * 64}%`;
    star.style.animationDelay = `${Math.random() * 10}s`;
    starContainer.appendChild(star);
  };

  for (let i = 0; i < 80; i++) {
    createStar();
  }

  const createShootingStar = () => {
    const shootingStar = document.createElement('div');
    shootingStar.className = 'shooting-star';
    shootingStar.style.left = `${Math.random() * 100}%`;
    shootingStar.style.top = `${Math.random() * 20}%`;
    shootingStar.style.animationDelay = `${Math.random() * 5}s`;
    starContainer.appendChild(shootingStar);

    setTimeout(() => {
      starContainer.removeChild(shootingStar);
    }, 2000);
  };

  setInterval(createShootingStar, 2000);
  document.body.appendChild(starContainer);
}

export function loader() {
  return `
  <style>
  .chat-loader {
    width: 88%;
    height: 64px;
    position: relative;
    overflow: visible;
    font-size: 0;
  } 
  .chat-loader::before {
    content: "";
    position: absolute;
    bottom: -20px;
    inset: auto 50% 0;
    width: 16px;
    aspect-ratio: 1;
    border-radius: 50%;
    background: var(--pm-primary-500);
    animation: 
      loader-0 .5s cubic-bezier(0,900,1,900) infinite,
      loader-1  2s linear infinite alternate;
  }
  @keyframes loader-0 {
    0%,2% { bottom: 0% }
    98%,to { bottom: 0.1% }
  }
  @keyframes loader-1 {
    0% { transform: translateX(-500%) }
    to { transform: translateX(500%) }
  }
  .chat-loader span {
    display: inline-block;
    animation: bounce 3s infinite ease-in-out;
    font-size: 16px;
    font-family: 'kleader';
    color: rgba(var(--pm-gray-100-rgb), 0.6);
  }
  .chat-loader span:nth-child(1) { animation-delay: 0s; }
  .chat-loader span:nth-child(2) { animation-delay: 0.2s; }
  .chat-loader span:nth-child(3) { animation-delay: 0.4s; }
  .chat-loader span:nth-child(4) { animation-delay: 0.6s; }
  .chat-loader span:nth-child(5) { animation-delay: 0.8s; }
  .chat-loader span:nth-child(6) { animation-delay: 1.0s; }
  .chat-loader span:nth-child(7) { animation-delay: 1.2s; }
  .chat-loader span:nth-child(8) { animation-delay: 1.4s; }
  .chat-loader span:nth-child(9) { animation-delay: 1.6s; }
  .chat-loader span:nth-child(10){ animation-delay: 1.8s; }

  @keyframes bounce {
    0%, 20%, 100% { transform: translateY(0); }
    16% { transform: translateY(-8px); }
  }
  </style>
  <div>
    <span>L</span>
    <span>o</span>
    <span>a</span>
    <span>d</span>
    <span>i</span>
    <span>n</span>
    <span>g</span>
  </div>
  `;
}

export function triggerRotateMoveShrink(element, duration = 1500) {
  element.classList.add('rotateMoveShrink');

  setTimeout(() => {
    element.style.visibility = 'hidden';
  }, duration);
}

export function flyAway(element, duration = 1000) {
  if (getComputedStyle(element).position === 'static') {
    element.style.position = 'relative';
  }
  element.classList.add('fly-away');

  setTimeout(() => {
    element.style.visibility = 'hidden';
  }, duration);
}

/**
 * Fire confetti animation from two launchers.
 * Each launcher fires confetti particles in a spread pattern.
 * @param {HTMLElement} parentElement
 */
export function fireConfetti(parentElement = document.body) {
  const confetti = document.createElement('div');
  confetti.innerHTML = `
    <div class="wrapper">
      <div class="launcher launcher1">
        <img src="/img/gun.png" alt="Launcher 1" />
      </div>
      <div class="launcher launcher2">
        <img src="/img/gun.png" alt="Launcher 2" />
      </div>
    </div>
    <style>
    .wrapper {
      position: absolute;
      bottom: 10%;
      left: 0;
      width: 100%;
      padding: 0 1rem;
      display: flex;
      flex-direction: row;
      align-items: center;
      justify-content: space-between;
    }
    .launcher {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .launcher img {
      width: 1.6rem;
      height: auto;
    }
    .launcher1 {
      transform: scaleX(-1) rotate(5deg);
    }
    .launcher2 {
      transform: rotate(5deg);
    }
    .confetti {
      position: absolute;
      width: 8px;
      height: 8px;
      clip-path: polygon(50% 0%, 66% 25%, 95% 25%, 76.96% 50%, 95% 75%, 66% 75%, 50% 100%, 32% 75%, 5% 75%, 19.98% 50%, 5% 25%, 32% 25%);
      opacity: 0;
      transform: scale(0);
      top: calc(50% - 16px);
      left: calc(50% - 16px);
    }
    </style>
    `;

  parentElement.appendChild(confetti);

  const launchers = document.querySelectorAll('.launcher');

  /**
   * Defines the colors for the confetti particles.
   */
  const COLORS = [
    getComputedStyle(document.documentElement).getPropertyValue('--pm-primary-500').trim(),
    getComputedStyle(document.documentElement).getPropertyValue('--pm-primary-400').trim(),
    getComputedStyle(document.documentElement).getPropertyValue('--pm-red-500').trim(),
  ];

  /**
   * Fires confetti particles from the specified launcher.
   * Each particle is animated to move in a spread pattern.
   * @param {HTMLElement} launcher - The launcher element from which to fire confetti.
   */
  const fire = (launcher) => {
    /**
     * Base angle for confetti spread in radians.
     * This angle is set to 220 degrees, which is approximately 40 degrees from the vertical axis.
     * The angle is converted to radians for use in trigonometric functions.
     * @type {number}
     */
    const baseAngle = (220 * Math.PI) / 180;

    /**
     * Spread angle for confetti particles in radians.
     * This defines how far the confetti will spread from the base angle.
     * The spread is set to 30 degrees, which is approximately ±25 degrees from the base angle.
     * @type {number}
     */
    const spread = (30 * Math.PI) / 180; // ±25°

    /**
     * Number of confetti particles to fire from each launcher.
     * This is set to 30 particles per launcher.
     * @type {number}
     */
    const count = 30;
    /**
     * Fires confetti particles from the specified launcher.
     * Each particle is created, styled, and animated to move in a spread pattern.
     * The particles are created in a loop, each with a unique color and animation.
     * The animation includes a translation based on the angle and speed, and a fade-out effect
     */
    for (let i = 0; i < count; i++) {
      const particle = document.createElement('div');
      particle.classList.add('confetti');
      particle.style.background = COLORS[i % COLORS.length];
      launcher.appendChild(particle);

      /**
       * Compute the velocity vector and animate the particle along that vector while scaling,
       * rotating, and fading it out. Finally, remove the particle from the DOM when the
       * animation completes.
       * @param {number} angle - Direction of motion in radians.
       * @param {number} speed - Magnitude of motion in pixels per frame.
       * @param {number} duration - Animation duration in milliseconds.
       */
      const angle = baseAngle + (Math.random() - 0.5) * spread;
      const speed = 280 + Math.random() * 150;
      const duration = 1500 + Math.random() * 800;

      // Calculate the movement vector components
      const dx = Math.cos(angle) * speed;
      const dy = Math.sin(angle) * speed;

      particle.animate(
        [
          // start at original position, full size and fully opaque
          { transform: 'translate(0,0) scale(1)', opacity: 1 },
          // move to (dx, dy), shrink to half size, rotate two full turns, and fade out
          { transform: `translate(${dx}px, ${dy}px) scale(0.5) rotate(720deg)`, opacity: 0 },
        ],
        {
          duration: duration,
          easing: 'cubic-bezier(0.33,1,0.68,1)', // smooth ease-out curve
          fill: 'forwards', // retain end state after finishing
        },
      ).onfinish = () => particle.remove();
    }
  };

  /**
   * Launches confetti from the two launchers in a specific pattern.
   * The pattern is defined by an array where each element corresponds to a launcher.
   * The launchers fire confetti in a sequence with a delay between each launch.
   * The total delay is calculated based on the number of launches and the delay between them.
   * @type {Array<number>}
   */
  const launchPattern = [0, 1, 0, 1, 1, 0, 0, 1, 0, 1];
  const delay = 200;
  let totalDelay = 0;
  for (let i = 0; i < launchPattern.length; i++) {
    const launcher = launchers[launchPattern[i]];
    setTimeout(() => {
      fire(launcher);
    }, i * delay);
    totalDelay += delay;
  }

  setTimeout(() => {
    parentElement.classList.add('fade-out-animation');
  }, totalDelay);
}

/**
 * Creates a burst of particles around a target element.
 * Each particle moves in a random direction and fades out.
 * @param {HTMLElement} wrapper - The container for the particles.
 * @param {HTMLElement} target - The target element around which particles will burst.
 * @param {string} color - The color of the particles, defaults to 'var(--pm-red-500)'.
 */
export function particleBurst(wrapper, target, color = 'var(--pm-red-500)') {
  for (let i = 0; i < 20; i++) {
    const particle = document.createElement('div');
    particle.classList.add('particle');
    const angle = Math.random() * 2 * Math.PI;
    const distance = Math.random() * 20 + 20;
    particle.style.setProperty('--dx', `${Math.cos(angle) * distance}px`);
    particle.style.setProperty('--dy', `${Math.sin(angle) * distance}px`);
    particle.style.background = color;
    const rect = target.getBoundingClientRect();
    particle.style.left = `${rect.left + rect.width / 2 - 4}px`;
    particle.style.top = `${rect.top + rect.height / 2 - 6}px`;
    wrapper.appendChild(particle);
    particle.addEventListener(
      'animationend',
      () => {
        particle.remove();
      },
      { once: true },
    );
  }
}
