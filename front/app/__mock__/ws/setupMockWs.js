// /__mock__/ws/setupMockWs.js
(async () => {
  // Load the shim and wait for it
  await new Promise((resolve, reject) => {
    const shim = document.createElement('script');
    shim.src = '/__mock__/ws/mockTournamentWs.js';
    shim.onload = () => {
      console.log('🏓 mockTournamentWs.js loaded');
      resolve();
    };
    shim.onerror = reject;
    document.head.appendChild(shim);
  });

  // Grab the tournament ID from the URL
  const match = window.location.pathname.match(/tournament\/([0-9a-f-]{36})/);
  const TOURNAMENT_ID = match ? match[1] : null;
  if (!TOURNAMENT_ID) {
    console.warn('No tournament ID found in path:', window.location.pathname);
  }

  // Import and reset your real socket
  const { socketManager } = await import('/src/js/sockets/index.js');
  window.socketManager = socketManager;
  socketManager.closeSocket('tournament', TOURNAMENT_ID);
  socketManager.openSocket('tournament', TOURNAMENT_ID);

  // Configure the mock helper
  const user = JSON.parse(sessionStorage.getItem('user') || 'null');
  window.mockWS.setTournamentId(TOURNAMENT_ID);
  window.mockWS.setUsername(user?.username || 'Unknown');

  console.log('🏓 Mock WS ready for tournament', TOURNAMENT_ID, 'as', window.mockWS.username);
})();

// This script sets up a mock WebSocket connection for tournament-related events.
// It will automatically load the mock WebSocket script and initialize the socket manager.
// Usage:
// document.head.appendChild(document.createElement('script')).src = '/__mock__/ws/setupMockWs.js';
