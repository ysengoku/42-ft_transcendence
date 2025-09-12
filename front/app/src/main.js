import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap';
import 'bootstrap-icons/font/bootstrap-icons.css';

import '@components/navbar/index.js';
import '@components/pages/index.js';
import { showTournamentAlert } from '@components/pages/tournament/utils/tournamentAlert';
import { auth } from '@auth';
import '@socket';
import '@css/style.css';
import { ThemeController } from '@utils';
import { createClouds, createStars } from '@utils';
import './js/utils/log.js';

document.addEventListener('DOMContentLoaded', async () => {
  log.info('DOM loaded');

  ThemeController.init();
  const lightBg = 'linear-gradient(rgba(170,79,236,0.8) 0%, rgba(236,79,84,0.8) 50%, rgba(236,79,84,0.8) 100%)';
  const darkBg = 'linear-gradient(rgb(23,18,40) 0%, rgb(62,52,97) 16%, rgb(95,83,138) 40%, #6670A2 100%)';
  function renderSky() {
    const theme = document.documentElement.getAttribute('data-bs-theme');
    if (theme === 'light') {
      document.getElementById('stars')?.remove();
      document.body.style.backgroundImage = lightBg;
      createClouds();
    } else {
      document.getElementById('cloud')?.remove();
      document.body.style.backgroundImage = darkBg;
      createStars();
    }
  }
  const observer = new MutationObserver(renderSky);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-bs-theme'],
  });
  renderSky();

  const authStatus = await auth.fetchAuthStatus();
  const navbarContainer = document.getElementById('navbar-container');
  if (navbarContainer) {
    const navbarElement = document.createElement('navbar-component');
    navbarElement.state = authStatus.success ? authStatus.response : null;
    navbarContainer.appendChild(navbarElement);
  } else {
    log.error('Error rendering navbar');
  }
  const currentPath = window.location.pathname || '/';
  if (
    authStatus.success &&
    authStatus.response.tournament_id &&
    !(currentPath.startsWith('/tournament') || currentPath.startsWith('/multiplayer-game'))
  ) {
    showTournamentAlert(authStatus.response.tournament_id);
  }
});

document.addEventListener('mousedown', () => {
  document.body.style.cursor = "url('/img/cursor-active.png') 8 8, auto";
});

document.addEventListener('mouseup', () => {
  document.body.style.cursor = "url('/img/gun.png') 4 4, auto";
});
