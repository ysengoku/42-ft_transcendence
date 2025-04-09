export function mockDuelBeforeData() {
  const data = {
    status: 'start',
    gameId: '1234567890',
    player1: {
      username: 'Pedro',
      nickname: 'Pedro',
      avatar: '/img/default-avatar.png',
      elo: 1480,
      is_online: true,
    },
    player2: {
      username: 'Alice',
      nickname: 'Alice',
      avatar: '/img/default-avatar.png',
      elo: 1500,
      is_online: true,
    },
    winner_score: 0,
    looser_score: 0,
    date: '',
  };
  return data;
}

export function mockDuelEndData() {
  const data = {
    status: 'end',
    gameId: '1234567890',
    player1: {
      username: 'Pedro',
      nickname: 'Pedro',
      avatar: '/img/default-avatar.png',
      elo: 1480,
      is_online: true,
    },
    player2: {
      username: 'Alice',
      nickname: 'Alice',
      avatar: '/img/default-avatar.png',
      elo: 1500,
      is_online: true,
    },
    winner_score: 5,
    looser_score: 3,
    date: '',
  };
  return data;
}
