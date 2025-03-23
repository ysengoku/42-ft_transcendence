import '@components/navbar/index.js';
import '@components/pages/index.js';
import '@css/style.css';
import { createClouds, createStars } from '@utils';

const savedTheme = localStorage.getItem('theme') || 'light';
document.documentElement.setAttribute('data-bs-theme', savedTheme);

const observer = new MutationObserver(() => {
  document.documentElement.getAttribute('data-bs-theme') === 'light' ? (
    document.getElementById('stars') ? document.body.removeChild(stars) : null,
    document.body.style.backgroundImage = `linear-gradient(rgba(170,79,236, 0.8) 0%, rgba(236,79,84, 0.8) 50%, rgba(236,79,84, 0.8) 100%)`,
    createClouds()
  ) : (
    document.getElementById('cloud') ? document.body.removeChild(cloud) : null,
    // document.body.style.backgroundImage = `linear-gradient(#080f1c 0%, #0d4261 32%,  #1473ab 100%)`,
    document.body.style.backgroundImage = `linear-gradient(rgba(43, 18, 55, 0.8) 0%, rgba(57, 24, 73, 0.8) 32%,  rgba(15, 14, 41, 0.8) 100%)`,
    createStars()
  );
});
observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-bs-theme'] });

document.addEventListener('mousedown', () => {
  document.body.style.cursor = 'url(\'/img/sample-cursor-active.png\') 8 8, auto';
});

document.addEventListener('mouseup', () => {
  document.body.style.cursor ='url(\'/img/sample-cursor.png\') 4 4, auto';
});
