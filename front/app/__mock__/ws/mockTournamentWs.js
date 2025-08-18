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
      alias: 'SilverWolf',
      avatar: '__mock__/img/sample-pic2.png',
    };
    this.simulateAction('tournament', 'new_registration', data);
  },

  simulateRegistrationCanceled() {
    const data = {
      alias: 'Mock Participant',
    };
    this.simulateAction('tournament', 'registration_canceled', data);
  },

  simulateTournamentCanceled() {
    const data = {
      tournament_id: this.tournamentId,
      tournament_name: 'Mock Tournament',
    };
    this.simulateAction('tournament', 'tournament_canceled', data);
  },

  simulateTournamentStart() {
    const data = {
      tournament_id: this.tournamentId,
      tournament_name: 'Mock Tournament',
      round: {
        number: 1,
        brackets: [
          {
            game_id: 1,
            participant1: {
              profile: {
                username: 'TheBall',
                avatar: '__mock__/img/sample-pic2.png',
              },
              alias: 'SilverWolf',
              status: 'pending',
            },
            participant2: {
              profile: {
                username: this.username || 'unknown',
                avatar: '__mock__/img/sample-pic3.png',
              },
              alias: 'StormRider',
              status: 'pending',
            },
            winner: null,
            status: 'pending',
            score_p1: 0,
            score_p2: 0,
          },
          {
            game_id: 2,
            participant1: {
              profile: {
                username: 'george',
                avatar: '/__mock__/img/sample-pic1.jpg',
              },
              alias: 'Midnight Rider',
              status: 'pending',
            },
            participant2: {
              profile: {
                username: 'alice',
                avatar: '/img/default_avatar.png',
              },
              alias: 'DuskDevil',
              status: 'pending',
            },
            winner: null,
            status: 'pending',
            score_p1: 0,
            score_p2: 0,
          },
        ],
      },
    };
    this.simulateAction('tournament', 'tournament_start', data);
  },

  simulateMatchResult() {
    const participant1 = {
      profile: {
        username: 'george',
        avatar: '/__mock__/img/sample-pic1.jpg',
      },
      alias: 'Midnight Rider',
      status: 'qualified',
    };
    const participant2 = {
      profile: {
        username: 'alice',
        avatar: '/img/default_avatar.png',
      },
      alias: 'DuskDevil',
      status: 'eliminated',
    };
    const data = {
      tournament_id: this.tournamentId,
      round_number: 1,
      bracket: {
        game_id: 'game2',
        participant1: participant1,
        participant2: participant2,
        winner: participant1,
        status: 'finished',
        score_p1: 5,
        score_p2: 4,
        winners_score: 5,
        losers_score: 4,
      },
    };
    this.simulateAction('tournament', 'match_result', data);
  },

  simulateRoundEnd() {
    const data = {
      tournament_id: this.tournamentId,
    };
    this.simulateAction('tournament', 'round_end', data);
  },

  simulateRoundStart() {
    const data = {
      tournament_id: this.tournamentId,
      tournament_name: 'Mock Tournament',
      round: {
        number: 2,
        brackets: [
          {
            game_id: 3,
            participant1: {
              profile: {
                username: 'george',
                avatar: '/__mock__/img/sample-pic1.jpg',
              },
              alias: 'Midnight Rider',
              status: 'pending',
            },
            participant2: {
              profile: {
                username: this.username || 'unknown',
                avatar: '/img/default_avatar.png',
              },
              alias: 'StormRider',
              status: 'pending',
            },
            winner: null,
            status: 'pending',
            score_p1: 0,
            score_p2: 0,
          },
        ],
      },
    };
    this.simulateAction('tournament', 'round_start', data);
  },
};

/*
Usage:
document.head.appendChild(document.createElement('script')).src = '/__mock__/ws/setupMockWs.js';

Then call the mock methods like:
window.mockWS.simulateNewRegistration();
*/
