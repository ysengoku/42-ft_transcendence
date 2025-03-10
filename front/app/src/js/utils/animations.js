
export function createClouds() {
  const contentContainer = document.getElementById('content');
  const cloud = document.createElement('div');
  cloud.id = 'cloud';
  contentContainer.appendChild(cloud);
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
  document.body.appendChild(starContainer);
};

export function createShootingStars() {
  const createShootingStar = () => {
    const shootingStar = document.createElement('div');
    shootingStar.className = 'shooting-star';
    shootingStar.style.left = `${Math.random() * 100}%`;
    shootingStar.style.top = `${Math.random() * 20}%`;
    shootingStar.style.animationDelay = `${Math.random() * 5}s`;
    document.body.appendChild(shootingStar);

    setTimeout(() => {
      document.body.removeChild(shootingStar);
    }, 2000);
  };
  setInterval(createShootingStar, 2000);
};
