import '@components/navbar/index.js';
import '@components/pages/index.js';
// import '@components/modals/index.js';
import '@css/style.css';

const savedTheme = localStorage.getItem('theme') || 'light';
document.documentElement.setAttribute('data-bs-theme', savedTheme);

document.addEventListener('mousedown', () => {
  document.body.style.cursor = 'url(\'/img/sample-cursor-active.png\') 8 8, auto';
});

document.addEventListener('mouseup', () => {
  document.body.style.cursor ='url(\'/img/sample-cursor.png\') 4 4, auto';
});
