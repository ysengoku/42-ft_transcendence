import '@components/navbar/index.js';
import '@components/pages/index.js';
import '@css/style.css';
import { createClouds, createStars } from '@utils';

const savedTheme = localStorage.getItem('theme') || 'light';
document.documentElement.setAttribute('data-bs-theme', savedTheme);

const observer = new MutationObserver(() => {
  document.documentElement.getAttribute('data-bs-theme') === 'light' ? (
    document.getElementById('stars') ? document.body.removeChild(stars) : null,
    document.body.style.backgroundImage = `linear-gradient(rgb(225, 164, 99),rgb(160, 94, 50), #d47a3e)`,
    createClouds()
  ) : (
    document.getElementById('cloud') ? document.getElementById('content').removeChild(cloud) : null,
    document.body.style.backgroundImage = `linear-gradient(#080f1c 0%, #0d4261 32%,  #1473ab 100%)`,
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
