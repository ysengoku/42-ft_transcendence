import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap';
import 'bootstrap-icons/font/bootstrap-icons.css';

import '@components/navbar/index.js';
import '@components/pages/index.js';
import '@css/style.css';
import { createClouds, createStars } from '@utils';

const theme = localStorage.getItem('theme') || 'light';
document.documentElement.setAttribute('data-bs-theme', theme);

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

window.devLog = (...args) => {
  if (process.env.NODE_ENV === 'development') {
    const stack = new Error().stack.split('\n')[2].trim();
    const match = stack.match(/([^\/\\]+:\d+:\d+)/);
    let location = match ? match[1] : 'unknown';
    location = location.replace(/\?t=\d+/, '');
    console.log('%c[DEV LOG]', 'color: green; font-weight: bold;', ...args, ` (${location})`);
  }
};

window.devErrorLog = (...args) => {
  if (process.env.NODE_ENV === 'development') {
    const stack = new Error().stack.split('\n')[2].trim();
    const match = stack.match(/([^\/\\]+:\d+:\d+)/);
    let location = match ? match[1] : 'unknown';
    location = location.replace(/\?t=\d+/, '');
    console.log('%c[ERROR]', 'color: red; font-weight: bold;', ...args, ` (${location})`);
  }
};

// window.devLog = (level, ...args) => {
//   if (process.env.NODE_ENV === 'development') {
//     const stack = new Error().stack.split('\n')[2].trim();
//     const match = stack.match(/([^\/\\]+:\d+:\d+)/);
//     let location = match ? match[1] : 'unknown';
//     location = location.replace(/\?t=\d+/, '');
//     if (level === `DEBUG`) {
//       console.log('%c[DEV LOG]', 'color: green; font-weight: bold;', ...args, ` (${location})`);
//     } else if (level === 'ERROR') {
//       console.log('%c[ERROR]', 'color: red; font-weight: bold;', ...args, ` (${location})`);
//     }
//   }
// };
