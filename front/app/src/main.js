import '@components/navbar/index.js';
import '@components/pages/index.js';
import '@css/style.css';

const savedTheme = localStorage.getItem('theme') || 'light';
document.documentElement.setAttribute('data-bs-theme', savedTheme);

// const observer = new MutationObserver(() => {
//   document.documentElement.getAttribute('data-bs-theme') === 'light' ? (
//     document.body.style.backgroundImage = `linear-gradient( #f3cca3, #d47a3e, #d47a3e)`
//   ) : (
//     document.body.style.backgroundImage = `linear-gradient( #080f1c 0%, #0d4261 32%,  #1473ab 100%)`);
// });
// observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-bs-theme'] });

document.addEventListener('mousedown', () => {
  document.body.style.cursor = 'url(\'/img/sample-cursor-active.png\') 8 8, auto';
});

document.addEventListener('mouseup', () => {
  document.body.style.cursor ='url(\'/img/sample-cursor.png\') 4 4, auto';
});
