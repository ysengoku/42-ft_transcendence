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
 * Creates a firework animation by launching particles from random positions on the screen.
 * Each particle moves in a random direction and fades out.
 * @param {HTMLElement} parent 
 * @returns {number} duration of the animation in ms
 */
export function fireWork(parent = document.body) {
  // Temporarily darken the background with semi-transparent gray
  const backgroundColor = getComputedStyle(document.documentElement)
  .getPropertyValue('--pm-gray-700-rgb')
  .trim();
  parent.style.position = 'relative';
  parent.style.backgroundColor = `rgba(${backgroundColor}, 0.8)`;

  // Create a container for the particles
  const container = document.createElement('div');
  container.style.position = 'absolute';
  container.style.width = parent.innerWidth + 'px';
  container.style.height = parent.innerHeight + 'px';
  container.style.top = '0';
  container.style.left = '0';
  container.style.pointerEvents = 'none';
  parent.appendChild(container);

  // Define the colors for the particles
  const colors = [
    getComputedStyle(document.documentElement).getPropertyValue('--pm-primary-500').trim(),
    getComputedStyle(document.documentElement).getPropertyValue('--pm-primary-400').trim(),
    getComputedStyle(document.documentElement).getPropertyValue('--pm-red-500').trim(),
  ];

  // Function to create and animate a firework launch
  function launch(x, y) {
    // Decide how many particles this firework will have (between 50–100)
    const particleCount = 50 + Math.floor(Math.random() * 50);
    for (let i = 0; i < particleCount; i++) {
      // Create a single particle (a small colored circle)
      const p = document.createElement('div');
      p.style.position = 'absolute';
      p.style.width = `${3 + Math.random() * 4}px`; // particle size (3–7px)
      p.style.height = p.style.width;
      p.style.borderRadius = '50%';
      p.style.background = colors[Math.floor(Math.random() * colors.length)]; // particle color
      p.style.left = x + 'px'; // starting horizontal position
      p.style.top = y + 'px'; // starting vertical position
      p.style.opacity = 1;
      p.style.pointerEvents = 'none';
      container.appendChild(p);

      // Give the particle a random direction and speed
      const angle = Math.random() * Math.PI * 2;
      const speed = 80 + Math.random() * 100; // pixels per second
      const dx = Math.cos(angle) * speed; // horizontal distance to move
      const dy = Math.sin(angle) * speed; // vertical distance to move
      const duration = 800 + Math.random() * 600; // duration of the animation (800–1400ms)

      // Animate the particle:
      // Start at the center (full size, visible)
      // Expand slightly as it moves outward
      // Shrink, rotate, and fade out
      p.animate(
        [
          { transform: 'translate(0,0) scale(1)', opacity: 1 },
          { transform: `translate(${dx/2}px, ${dy/2}px) scale(1.5)`, opacity: 1 },
          { transform: `translate(${dx}px, ${dy}px) scale(0.3) rotate(${Math.random() * 720}deg)`, opacity: 0 }
        ],
        { duration: duration,
          easing: 'cubic-bezier(0.33,1,0.68,1)', // smooth acceleration & deceleration
          fill: 'forwards' }
      ).onfinish = () => p.remove(); // remove particle when finished
    }
  }

  // Launch multiple fireworks from random positions
  const launches = 16;
  const interval = 320;
  const animationDuration = launches * interval + 1000;
  for (let i = 0; i < launches; i++) {
    setTimeout(() => {
      launch(Math.random() * window.innerWidth, Math.random() * window.innerHeight / 2);
    }, i * interval);
  }
  // Clean up after the animation
  setTimeout(() => {
    container.remove();
    parent.style.position = '';
    parent.style.backgroundColor = '';
  }, animationDuration);
  return animationDuration;
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
