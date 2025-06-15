class MockWebSocket {
  static OPEN = 1;
  constructor(url) {
    this.url = url;
    this.readyState = MockWebSocket.OPEN;
    this.onopen = this.onmessage = this.onerror = this.onclose = null;
    setTimeout(() => this.onopen?.({ target: this }), 0);
  }
  send(data) {
    console.log('[MockWebSocket] send:', data);
  }
  close() {
    this.readyState = 3;
    this.onclose?.({ code: 1000, reason: 'normal closure' });
  }
  simulateServerMessage(obj) {
    this.onmessage?.({ data: JSON.stringify(obj) });
  }
}
// Replace the global WebSocket with the mock version
window.WebSocket = MockWebSocket;
console.log('MockWebSocket initialized. All WebSocket connections will use this mock.');
console.log(window.WebSocket?.toString());

window.mockWS = {
  simulateAction(socketName, action, data = {}) {
    const manager = window.socketManager?.sockets.get(socketName);
    if (!manager) {
      console.error(`socket '${socketName}' is not open`);
      return;
    }
    manager.socket.simulateServerMessage({ action, data });
  },

  setTournamentId(id) {
    this.tournamentId = id;
  },

  setUsername(username) {
	this.username = username;
  },

  simulateNewRegistration() {
    const data = {
      alias: 'Mock Participant',
      avatar: '__mock__/img/sample-pic2.png',
    }
    this.simulateAction('tournament', 'new_registration', data);
  },

  simulateRegistrationCanceled() {
    const data = {
      alias: 'Mock Participant',
    }
    this.simulateAction('tournament', 'registration_canceled', data);
  },

  simulateTournamentCanceled() {
    const data = {
      tournament_id: this.tournamentId,
      tournament_name: 'Mock Tournament',
    }
    this.simulateAction('tournament', 'tournament_canceled', data);
  },

  simulateTournamentStart() {
    const data = {
      tournament_id: this.tournamentId,
      tournament_name: 'Mock Tournament',
      round: {
        'number': 1,
        'brackets': [
          {
            'game_id': 1,
            'participant1': {
              'profile': {
                'username': 'TheBall',
                'avatar': '/img/default_avatar.png',
              },
              'alias': 'SilverWolf',
              'status': 'pending'
            },
            'participant2': {
              'profile': {
                'username': this.username || 'Me',
                'avatar': '/img/default_avatar.png',
              },
              'alias': 'StormRider',
              'status': 'pending'
            },
            'winner': null,
            'status': 'pending',
            'score_p1': 0,
            'score_p2': 0
          },
          {
            'game_id': 2,
            'participant1': {
              'profile': {
                'username': 'warhawk',
                'avatar': '/img/default_avatar.png',
              },
              'alias': 'ShadowFox',
              'status': 'pending'
            },
            'participant2': {
              'profile': {
                'username': 'faboussa',
                'avatar': '/img/default_avatar.png',
              },
              'alias': 'GoldenEagle',
              'status': 'pending'
            },
            'winner': null,
            'status': 'pending',
            'score_p1': 0,
            'score_p2': 0
          },
		]
      },
	}
    this.simulateAction('tournament', 'tournament_start', data);
  },

};

/*
const s = document.createElement('script');
s.src = '/__mock__/ws/mockTournamentWs.js';
s.onload = () => console.log('✅ mockTournamentWs.js loaded');
document.head.appendChild(s);

const match = window.location.pathname.match(/tournament\/([0-9a-f-]{36})/);
const TOURNAMENT_ID = match ? match[1] : null;
window.socketManager = (await import('/src/js/sockets/index.js')).socketManager;
socketManager.closeSocket('tournament', TOURNAMENT_ID);
socketManager.openSocket('tournament', TOURNAMENT_ID);
*/

/*
mockWS.simulateNewRegistration();
*/