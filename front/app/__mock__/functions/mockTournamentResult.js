export function mockTournamentResult() {
  const pedro = {
    profile: {
      username: 'Pedro',
      nickname: 'Pedro',
      avatar: '/__mock__/img/sample-pic2.png',
      elo: 130,
      is_online: true,
    },
    alias: 'Pedro',
    status: 'eliminated',
  };

  const pedro0 = {
    profile: {
      username: 'Pedro0',
      nickname: 'Pedro0',
      avatar: '/img/pedro.png',
      elo: 1000,
      is_online: false,
    },
    alias: 'Pedro0',
    status: 'eliminated',
  };

  const pedro1 = {
    profile: {
      username: 'Pedro1',
      nickname: 'Pedro1',
      avatar: '/img/default_avatar.png',
      elo: 1000,
      is_online: false,
    },
    alias: 'Pedro1',
    status: 'eliminated',
  };

  const pedro2 = {
    profile: {
      username: 'Pedro2',
      nickname: 'Pedro2',
      avatar: 'https://picsum.photos/200/300',
      elo: 1000,
      is_online: false,
    },
    alias: 'Pedro2',
    status: 'eliminated',
  };

  const pedro4 = {
    profile: {
      username: 'Pedro4',
      nickname: 'Pedro4',
      avatar: 'https://picsum.photos/400/300',
      elo: 1000,
      is_online: false,
    },
    alias: 'Pedro4',
    status: 'eliminated',
  };

  const george55 = {
    profile: {
      username: 'george55',
      nickname: 'george55',
      avatar: '/__mock__/img/sample-pic1.jpg',
      elo: 1105,
      is_online: false,
    },
    alias: 'george55',
    status: 'eliminated',
  };

  const ysengoku = {
    profile: {
      username: 'ysengoku',
      nickname: 'ysengoku',
      avatar: 'https://avatars.githubusercontent.com/u/130462445?v=4',
      elo: 1000,
      is_online: true,
    },
    alias: 'ysengoku',
    status: 'eliminated',
  };

  const yusengok = {
    profile: {
      username: 'yusengok',
      nickname: 'yusengok',
      avatar: '/__mock__/img/sample-pic3.png',
      elo: 1000,
      is_online: false,
    },
    alias: 'yusengok',
    status: 'winner',
  };

  const data = {
    tournament_creator: pedro,
    id: '93027f96-a92d-408a-b140-016907716793',
    name: 'coooool',
    rounds: [
      {
        number: 1,
        brackets: [
          {
            game_id: '050955dd-f7db-4e3b-bfae-81605ef07e03',
            participant1: pedro0,
            participant2: ysengoku,
            winner: ysengoku,
            status: 'finished',
            score_p1: 0,
            score_p2: 0,
          },
          {
            game_id: 'f7fd0a89-326d-487c-86e6-9730df3428f4',
            participant1: pedro4,
            participant2: yusengok,
            winner: yusengok,
            status: 'finished',
            score_p1: 0,
            score_p2: 0,
          },
          {
            game_id: '360aed31-5ac4-46f2-b7f8-4df692e1a9bb',
            participant1: george55,
            participant2: pedro2,
            winner: george55,
            status: 'finished',
            score_p1: 0,
            score_p2: 0,
          },
          {
            game_id: 'be7ce7bf-7b20-479e-afa0-52216de19ea7',
            participant1: pedro,
            participant2: pedro1,
            winner: pedro1,
            status: 'finished',
            score_p1: 0,
            score_p2: 5,
          },
        ],
        status: 'finished',
      },
      {
        number: 2,
        brackets: [
          {
            game_id: 'c1b224aa-116e-4a48-87ce-d0e5af3932f2',
            participant1: ysengoku,
            participant2: pedro1,
            winner: pedro1,
            status: 'finished',
            score_p1: 0,
            score_p2: 0,
          },
          {
            game_id: 'd4007f7c-9065-4614-bb39-885d13dd9fea',
            participant1: yusengok,
            participant2: george55,
            winner: yusengok,
            status: 'finished',
            score_p1: 0,
            score_p2: 0,
          },
        ],
        status: 'finished',
      },
      {
        number: 3,
        brackets: [
          {
            game_id: '9e8693ec-6d83-43f7-aa8e-a920fcc2e078',
            participant1: yusengok,
            participant2: pedro1,
            winner: yusengok,
            status: 'finished',
            score_p1: 0,
            score_p2: 0,
          },
        ],
        status: 'finished',
      },
    ],
    participants: [pedro, pedro0, pedro1, pedro2, pedro4, george55, yusengok, ysengoku],
    status: 'finished',
    required_participants: 8,
    date: '2025-07-01T13:10:17.556Z',
    participants_count: 8,
    settings: {
      game_speed: 'fast',
      score_to_win: 3,
      time_limit: 1,
      ranked: false,
      cool_mode: false,
    },
    winner: yusengok,
  };
  return data;
}
