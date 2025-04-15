export function mockDuelData(status) {
  switch (status) {
    case 'waiting_opponent':
      return withoutResult('waiting_opponent');
    case 'starting':
      return withoutResult('starting');
    case 'canceled':
      return withoutResult('canceled');
    case 'finished':
      return finished;
    default:
      return withoutResult('starting');
  }
}

function withoutResult(status) {
  const data = {
    status: status,
    gameId: '1234567890',
    player1: {
      username: 'Pedro',
      nickname: 'Pedro',
      avatar: '/img/default_avatar.png',
      elo: 1480,
      is_online: true,
    },
    player2: {
      username: 'Alice',
      nickname: 'Alice',
      avatar: '/img/default_avatar.png',
      elo: 1500,
      is_online: true,
    },
    winner_score: 0,
    looser_score: 0,
    date: '',
  };
  return data;
}

const finished = {
  winner: {
    username: 'evil_sherif',
    nickname: 'evil_sherif',
    avatar: '/img/default_avatar.png',
    elo: 1033,
    is_online: true,
  },
  loser: {
    username: 'Pedro',
    nickname: 'Pedro',
    avatar: '/img/default_avatar.png',
    elo: 935,
    is_online: true,
  },
  winners_score: 5,
  losers_score: 1,
  date: '2025-04-15T02:58:36.682Z',
};
