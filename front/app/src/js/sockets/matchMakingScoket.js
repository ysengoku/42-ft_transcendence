import { socketManager } from './socket';

// Socket registration for matchmaking
socketManager.addSocket('matchmaking', {
  game_found: (data) => {
    const customEvent = new CustomEvent('gameFound', { detail: data, bubbles: true });
    document.dispatchEvent(customEvent);
  },
});
