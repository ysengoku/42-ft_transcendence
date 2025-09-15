import { socketManager } from './socket';
import { router } from '@router';

// Socket registration for matchmaking
socketManager.addSocket('matchmaking', {
  game_found: (data) => {
    if (window.location.pathname === '/duel') {
      const duelPageElement = document.querySelector('duel-page');
      if (duelPageElement) {
        duelPageElement.handleGameFound(data);
      }
    } else {
      router.navigate('/duel', { status: 'matchmaking' });
      requestAnimationFrame(() => {
        const duelPageElement = document.querySelector('duel-page');
        if (duelPageElement) {
          duelPageElement.handleGameFound(data);
        }
      });
    }
  },
});
