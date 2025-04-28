export async function mockTournamentList() {
  const data = [
    {
    tournament_id: 'kagerhnpewn16461gdsga',
    name: 'Peacemakers Cup',
    date: '2025-05-01T12:00:00Z',
    status: 'lobby',
    required_participants: 8,
    creator: {
      alias: 'MidnightMarshal',
      user: {
      username: 'Pedro',
      nickname: 'Pedro',
      avatar: '/__mock__/img/sample-pic2.png',
      elo: 1500,
      is_online: true,
      }
    },
    participants: [
      {
      alias: 'WhiskeyDuke',
      user: {
        username: 'GeorgeLucas',
        nickname: 'The Legend',
        avatar: '/__mock__/img/sample-pic2.png',
        elo: 1500,
        is_online: true,
      }
      },
      {
      alias: 'LoneStar',
      user: {
        username: 'Alex',
        nickname: 'Jedi Master',
        avatar: '/__mock__/img/sample-pic3.png',
        elo: 1500,
        is_online: false,
      }
      },
      {
      alias: 'ShadowFang',
      user: {
        username: 'ShadowFang',
        nickname: 'The Phantom',
        avatar: '/__mock__/img/sample-pic1.jpg',
        elo: 1500,
        is_online: true,
      }
      }
    ],
    winner: null,
    },
    {
    tournament_id: 'bqwerty123451234qwe',
    name: 'Valor Clash',
    date: '2025-06-10T15:00:00Z',
    status: 'ongoing',
    required_participants: 16,
    creator: {
      alias: 'BladeRunner',
      user: {
      username: 'SarahConnor',
      nickname: 'Time Traveler',
      avatar: '/__mock__/img/sample-pic3.png',
      elo: 1600,
      is_online: true,
      }
    },
    participants: [],
    winner: null,
    },
    {
    tournament_id: 'cultimate78904567abcdef',
    name: 'Ultimate Throwdown',
    date: '2025-04-20T18:00:00Z',
    status: 'finished',
    required_participants: 4,
    creator: {
      alias: 'SilentStorm',
      user: {
      username: 'Morgan',
      nickname: 'The Whisper',
      avatar: '/__mock__/img/sample-pic1.jpg',
      elo: 1450,
      is_online: false,
      }
    },
    participants: [
      {
      alias: 'SpeedFreak',
      user: {
        username: 'Tommy',
        nickname: 'Speedster',
        avatar: '/__mock__/img/sample-pic2.png',
        elo: 1550,
        is_online: false,
      }
      }
    ],
    winner: {
      alias: 'SpeedFreak',
      user: {
      username: 'Tommy',
      nickname: 'Speedster',
      avatar: '/__mock__/img/sample-pic2.png',
      elo: 1550,
      is_online: false,
      }
    },
    },
    {
    tournament_id: 'dgladiator123asdasd',
    name: 'Gladiator\'s Arena',
    date: '2025-05-15T20:00:00Z',
    status: 'lobby',
    required_participants: 32,
    creator: {
      alias: 'WarHammer',
      user: {
      username: 'Olivia',
      nickname: 'The Hammer',
      avatar: '/__mock__/img/sample-pic3.png',
      elo: 1700,
      is_online: true,
      }
    },
    participants: [],
    winner: null,
    },
    {
    tournament_id: 'esniper45678zxcvbnm',
    name: 'Sniper Showdown',
    date: '2025-07-01T10:00:00Z',
    status: 'lobby',
    required_participants: 8,
    creator: {
      alias: 'SharpShot',
      user: {
      username: 'Daniel',
      nickname: 'Eagle Eye',
      avatar: '/__mock__/img/sample-pic1.jpg',
      elo: 1520,
      is_online: false,
      }
    },
    participants: [
      {
      alias: 'QuickSilver',
      user: {
        username: 'Sam',
        nickname: 'Blitz',
        avatar: '/__mock__/img/sample-pic2.png',
        elo: 1490,
        is_online: true,
      }
      }
    ],
    winner: null,
    },
    {
    tournament_id: 'fnexus99999poiuytrewq',
    name: 'Nexus Battle',
    date: '2025-08-20T14:00:00Z',
    status: 'lobby',
    required_participants: 16,
    creator: {
      alias: 'DarkKnight',
      user: {
      username: 'Bruce',
      nickname: 'The Bat',
      avatar: '/__mock__/img/sample-pic3.png',
      elo: 1800,
      is_online: true,
      }
    },
    participants: [],
    winner: null,
    },
  ];
  return { items: data, count: 6 };
};
