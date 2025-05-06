export async function mockTournamentData(status) {
  const data = {
    lobby: {
      tournament_id: 'kagerhnpewn16461gdsga',
      tournament_name: 'Peacemakers Cup',
      date: '2025-05-01T12:00:00Z',
      status: 'lobby',
      required_participants: 8,
      creator: {
        username: 'Pedro',
        nickname: 'Pedro',
        avatar: '/__mock__/img/sample-pic2.png',
        elo: 1500,
        is_online: true,
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
    ongoing: {
      tournament_id: 'bqwerty123451234qwe',
      tournament_name: 'Valor Clash',
      date: '2025-06-10T15:00:00Z',
      status: 'ongoing',
      required_participants: 8,
      creator: {
        username: 'SarahConnor',
        nickname: 'Time Traveler',
        avatar: '/__mock__/img/sample-pic3.png',
        elo: 1600,
        is_online: true,
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
        },
        {
          alias: 'SpeedFreak',
          user: {
            username: 'Tommy',
            nickname: 'Speedster',
            avatar: '/__mock__/img/sample-pic2.png',
            elo: 1550,
            is_online: false,
          }
        },
        {
          alias: 'QuickSilver',
          user: {
            username: 'Sam',
            nickname: 'Blitz',
            avatar: '/__mock__/img/sample-pic2.png',
            elo: 1490,
            is_online: true,
          }
        },
        {
          alias: 'SilentStorm',
          user: {
            username: 'Morgan',
            nickname: 'The Whisper',
            avatar: '/__mock__/img/sample-pic1.jpg',
            elo: 1450,
            is_online: false,
          }
        },
        {
          alias: 'LoneStar',
          user: {
            username: 'Sammy',
            nickname: 'Blitz',
            avatar: '/__mock__/img/sample-pic2.png',
            elo: 1490,
            is_online: true,
          }
        },
        {
          alias: 'StormBreaker',
          user: {
            username: 'Morganv',
            nickname: 'The Whisper',
            avatar: '/__mock__/img/sample-pic1.jpg',
            elo: 1450,
            is_online: false,
          }
        },
      ],
      winner: null,
    },
    finished: {
      tournament_id: 'cultimate78904567abcdef',
      tournament_name: 'Ultimate Throwdown',
      date: '2025-04-20T18:00:00Z',
      status: 'finished',
      required_participants: 4,
      creator: {
        username: 'Morgan',
        nickname: 'The Whisper',
        avatar: '/__mock__/img/sample-pic1.jpg',
        elo: 1450,
        is_online: false,
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
        },
        {
          alias: 'QuickSilver',
          user: {
            username: 'Sam',
            nickname: 'Blitz',
            avatar: '/__mock__/img/sample-pic2.png',
            elo: 1490,
            is_online: true,
          }
        },
        {
          alias: 'SilentStorm',
          user: {
            username: 'Morgan',
            nickname: 'The Whisper',
            avatar: '/__mock__/img/sample-pic1.jpg',
            elo: 1450,
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
        },
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
  };
  return data[status];
};
