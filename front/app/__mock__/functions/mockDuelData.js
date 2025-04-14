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
  status: 'finished',
  gameId: '1234567890',
  winner: {
    username: 'Pedro',
    nickname: 'Pedro',
    avatar: '/__mock__/img/sample-pic1.jpg',
    elo: 1480,
    is_online: true,
  },
  loser: {
    username: 'Alice',
    nickname: 'Alice',
    avatar: '/__mock__/img/sample-pic2.png',
    elo: 1500,
    is_online: true,
  },
  winner_score: 15,
  looser_score: 3,
  date: '2025-04-02T09:00:00Z',
};
