export function mockRoundStartData() {
  const data = {
    round: {
      number: 1,
      brackets: [
        {
          game_id: 'game1',
          participant1: {
            user: {
              username: 'user1',
              nickname: 'MidnightRider',
              avatar: '/__mock__/img/sample-pic3.png',
              elo: 1500,
              is_online: false
            },
            alias: 'MidnightRider',
            status: 'won',
          },
          participant2: {
            user: {
              username: 'user2',
              nickname: 'Player Two',
              avatar: '/__mock__/img/sample-pic3.png',
              elo: 1400,
              is_online: true
            },
            alias: 'Lone Cactus',
            status: 'eliminated',
          },
          winner: {},
          round: 1,
          score_p1: 0,
          score_p2: 0,
        },
        {
          game_id: 'game2',
          participant1: {
            user: {
              username: 'user3',
              nickname: 'Player Three',
              avatar: '/__mock__/img/sample-pic3.png',
              elo: 1450,
              is_online: true
            },
            alias: 'LazyFox',
          },
          participant2: {
            user: {
              username: 'user4',
              nickname: 'Player Four',
              avatar: '/__mock__/img/sample-pic3.png',
              elo: 1300,
              is_online: false
            },
            alias: 'DuskDevil',
          },
          winner: {},
          round: 1,
          score_p1: 0,
          score_p2: 0,
        },
        {
          game_id: 'game3',
          participant1: {
            user: {
              username: 'user5',
              nickname: 'Player Five',
              avatar: '/__mock__/img/sample-pic3.png',
              elo: 1350,
              is_online: true
            },
            alias: 'DirtyHarry',
            status: 'won',
          },
          participant2: {
            user: {
              username: 'user6',
              nickname: 'Player Six',
              avatar: '/__mock__/img/sample-pic3.png',
              elo: 1200,
              is_online: true
            },
            alias: 'CactusJack',
            status: 'eliminated',
          },
          winner: {},
          round: 1,
          score_p1: 0,
          score_p2: 0,
        },
        {
          game_id: 'game4',
          participant1: {
            user: {
              username: 'user7',
              nickname: 'Player Seven',
              avatar: '/__mock__/img/sample-pic3.png',
              elo: 1250,
              is_online: true,
            },
            alias: 'Gunslinger',
            status: '',
          },
          participant2: {
            user: {
              username: 'user8',
              nickname: 'Player Eight',
              avatar: '/__mock__/img/sample-pic3.png',
              elo: 1100,
              is_online: false,
            },
            alias: 'Rustler',
            status: '',
          },
          winner: {},
          round: 1,
          score_p1: 0,
          score_p2: 0
        },
      ],
    },
  };
  return data;
}
