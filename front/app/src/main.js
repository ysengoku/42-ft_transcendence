import "@components/navbar/index.js";
import "@components/pages/index.js";
import "@components/modals/index.js";
import '@css/style.css'

const savedTheme = localStorage.getItem("theme") || "light";
document.documentElement.setAttribute("data-bs-theme", savedTheme);
