import '@components/navbar/index.js';
import '@components/pages/index.js';
import '@css/style.css';

const savedTheme = localStorage.getItem('theme') || 'light';
document.documentElement.setAttribute('data-bs-theme', savedTheme);

const observer = new MutationObserver(() => {
  document.documentElement.getAttribute('data-bs-theme') === 'light' ? 
    document.body.style.backgroundImage = `linear-gradient(180deg,rgb(243, 204, 163), #d47a3e,  #d47a3e)` :
    document.body.style.backgroundImage = `linear-gradient(0deg, #115d89,rgb(13, 66, 97), #080f1c)`;
});
observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-bs-theme'] });

document.addEventListener('mousedown', () => {
  document.body.style.cursor = 'url(\'/img/sample-cursor-active.png\') 8 8, auto';
});

document.addEventListener('mouseup', () => {
  document.body.style.cursor ='url(\'/img/sample-cursor.png\') 4 4, auto';
});
