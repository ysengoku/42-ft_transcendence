const theme = localStorage.getItem('theme') || 'light';
document.documentElement.setAttribute('data-bs-theme', theme);
