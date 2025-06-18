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
    /* background: radial-gradient(circle at 16% 16%, var(--pm-primary-300) 20%, var(--pm-primary-500) 48%, var(--pm-primary-700) 100%); */
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
    font-size: 20px;
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
    <span>.</span>
    <span>.</span>
    <span>.</span>
  </div>
  `;
}

export function triggerRotateMoveShrink(el, duration = 1500) {
  el.classList.add('rotateMoveShrink');

  setTimeout(() => {
    el.style.visibility = 'hidden';
  }, duration);
}

export function flyAway(el, duration = 1000) {
  if (getComputedStyle(el).position === 'static') {
    el.style.position = 'relative';
  }
  el.classList.add('fly-away');

  setTimeout(() => {
    el.style.visibility = 'hidden';
  }, duration);
}

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
      left: 10%;
      display: flex;
      flex-direction: row;
      align-items: center;
      justify-content: center;
      gap: 24rem;
    }
    .launcher {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .launcher1 {
      transform: scaleX(-1) rotate(5deg);
    }
    .launcher2 {
      transform: rotate(5deg);
    }
    .confetti {
      position: absolute;
      width: 6px;
      height: 6px;
      clip-path: polygon(50% 0%, 66% 25%, 95% 25%, 76.96% 50%, 95% 75%, 66% 75%, 50% 100%, 32% 75%, 5% 75%, 19.98% 50%, 5% 25%, 32% 25%);
      opacity: 0;
      transform: scale(0);
      top: calc(50% - 3px);
      left: calc(50% - 3px);
    }
    </style>
    `;

  parentElement.appendChild(confetti);

  const launchers = document.querySelectorAll('.launcher');
  console.log('Launchers:', launchers);
  const COLORS = [
    getComputedStyle(document.documentElement).getPropertyValue('--pm-primary-500').trim(),
    getComputedStyle(document.documentElement).getPropertyValue('--pm-primary-400').trim(),
    getComputedStyle(document.documentElement).getPropertyValue('--pm-red-500').trim(),
  ];

  const fire = (launcher) => {
    const baseAngle = (220 * Math.PI) / 180;
    const spread = (30 * Math.PI) / 180; // ±25°

    const count = 30;
    for (let i = 0; i < count; i++) {
      const dot = document.createElement('div');
      dot.classList.add('confetti');
      dot.style.background = COLORS[i % COLORS.length];
      launcher.appendChild(dot);

      const angle = baseAngle + (Math.random() - 0.5) * spread;
      const speed = 280 + Math.random() * 150; // px/sec
      const duration = 1500 + Math.random() * 600; // ms

      const dx = Math.cos(angle) * speed;
      const dy = Math.sin(angle) * speed;

      dot.animate(
        [
          { transform: 'translate(0,0) scale(1)', opacity: 1 },
          { transform: `translate(${dx}px, ${dy}px) scale(0.5) rotate(720deg)`, opacity: 0 },
        ],
        {
          duration: duration,
          easing: 'cubic-bezier(0.33,1,0.68,1)',
          fill: 'forwards',
        },
      ).onfinish = () => dot.remove();
    }
  };

  const launchPattern = [0, 1, 0, 1, 1, 0, 0, 1, 0, 1];
  const delay = 250;
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
