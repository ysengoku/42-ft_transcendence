
export function createClouds() {
  const cloud = document.createElement('div');
  cloud.id = 'cloud';
  document.body.appendChild(cloud);
};

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
};

export function loader() {
  return `
  <style>
  .chat-loader {
    width: 88%;
    height: 64px;
    position: relative;
    overflow: visible;
  } 
  .chat-loader::before {
    content: "";
    position: absolute;
    bottom: -20px;
    inset: auto 50% 0;
    width: 16px;
    aspect-ratio: 1;
    border-radius: 50%;
    background: radial-gradient(circle at 16% 16%, var(--pm-primary-300) 20%, var(--pm-primary-500) 48%, var(--pm-primary-700) 100%);
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
