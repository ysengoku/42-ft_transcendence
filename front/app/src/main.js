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
    document.body.style.backgroundImage = `linear-gradient(rgb(23, 18, 40) 0%, rgb(62, 52, 97) 16%, rgb(95, 83, 138) 40%, #6670A2 100%)`,
    createStars()
  );
});
observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-bs-theme'] });

document.addEventListener('mousedown', () => {
  document.body.style.cursor = 'url(\'/img/sample-cursor-active.png\') 8 8, auto';
});

document.addEventListener('mouseup', () => {
  document.body.style.cursor ='url(\'/img/gun.png\') 4 4, auto';
});
