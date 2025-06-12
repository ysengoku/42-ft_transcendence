export function mockFetchTournament(username, status) {
  const data = {
    pending: {
      id: 'idpending',
      name: 'Summer Championship',
      status: 'pending',
      creator: {
        username: 'pedro',
        avatar: '/__mock__/img/sample-pic2.png',
      },
      winner: {},
      date: '',
      rounds: [],
      participants: [
        {
          profile: {
            username: 'alex',
            avatar: '/__mock__/img/sample-pic3.png',
          },
          alias: 'Nightmare',
        },
        {
          profile: {
            username: `${username}`,
            avatar: '/__mock__/img/sample-pic2.png',
          },
          alias: 'Lone Cactus',
        },
        {
          profile: {
            username: 'george',
            avatar: '/__mock__/img/sample-pic1.jpg',
          },
          alias: 'Midnight Rider',
        },
      ],
      required_participants: 4,
    },
    tournamentpending: {
      id: 'idroundpending',
      name: 'Summer Championship',
      status: 'ongoing',
      creator: {
        username: 'pedro',
        avatar: '/__mock__/img/sample-pic2.png',
      },
      winner: null,
      date: '',
      rounds: [
        {
          number: 1,
          status: 'pending',
          brackets: [
            {
              game_id: 'game1',
              participant1: {
                profile: {
                  username: 'alex',
                  avatar: '/__mock__/img/sample-pic3.png',
                },
                alias: 'Nightmare',
                status: 'pending',
              },
              participant2: {
                profile: {
                  username: `${username}`,
                  avatar: '/__mock__/img/sample-pic2.png',
                },
                alias: 'Lone Cactus',
                status: 'pending',
              },
              winner: null,
              status: 'pending',
              score_p1: 0,
              score_p2: 0,
            },
            {
              game_id: 'game2',
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
                  avatar: '/img/fefault_avatar.png',
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
      ],
      participants: [
        {
          profile: {
            username: 'alex',
            avatar: '/__mock__/img/sample-pic3.png',
          },
          alias: 'Nightmare',
          status: 'pending',
        },
        {
          profile: {
            username: `${username}`,
            avatar: '/__mock__/img/sample-pic2.png',
          },
          alias: 'Lone Cactus',
          status: 'pending',
        },
        {
          profile: {
            username: 'george',
            avatar: '/__mock__/img/sample-pic1.jpg',
          },
          alias: 'Midnight Rider',
          status: 'pending',
        },
        {
          profile: {
            username: 'alice',
            avatar: '/img/fefault_avatar.png',
          },
          alias: 'DuskDevil',
          status: 'pending',
        },
      ],
      required_participants: 4,
    },
    waitingNextRound: {
      id: 'idroundpending',
      name: 'Summer Championship',
      status: 'ongoing',
      creator: {
        username: 'pedro',
        avatar: '/__mock__/img/sample-pic2.png',
      },
      winner: null,
      date: '',
      rounds: [
        {
          number: 1,
          status: 'ongoing',
          brackets: [
            {
              game_id: 'game1',
              participant1: {
                profile: {
                  username: 'alex',
                  avatar: '/__mock__/img/sample-pic3.png',
                },
                alias: 'Nightmare',
                status: 'eliminated',
              },
              participant2: {
                profile: {
                  username: `${username}`,
                  avatar: '/__mock__/img/sample-pic2.png',
                },
                alias: 'Lone Cactus',
                status: 'qualified',
              },
              winner: {
                profile: {
                  username: `${username}`,
                  avatar: '/__mock__/img/sample-pic2.png',
                },
                alias: 'Lone Cactus',
                status: 'qualified',
              },
              status: 'finished',
              score_p1: 3,
              score_p2: 10,
            },
            {
              game_id: 'game2',
              participant1: {
                profile: {
                  username: 'george',
                  avatar: '/__mock__/img/sample-pic1.jpg',
                },
                alias: 'Midnight Rider',
                status: 'playing',
              },
              participant2: {
                profile: {
                  username: 'alice',
                  avatar: '/img/fefault_avatar.png',
                },
                alias: 'DuskDevil',
                status: 'playing',
              },
              winner: null,
              status: 'ongoing',
              score_p1: 8,
              score_p2: 8,
            },
          ],
        },
      ],
      participants: [
        {
          profile: {
            username: 'alex',
            avatar: '/__mock__/img/sample-pic3.png',
          },
          alias: 'Nightmare',
        },
        {
          profile: {
            username: `${username}`,
            avatar: '/__mock__/img/sample-pic2.png',
          },
          alias: 'Lone Cactus',
        },
        {
          profile: {
            username: 'george',
            avatar: '/__mock__/img/sample-pic1.jpg',
          },
          alias: 'Midnight Rider',
        },
        {
          profile: {
            username: 'alice',
            avatar: '/img/fefault_avatar.png',
          },
          alias: 'DuskDevil',
        },
      ],
      required_participants: 4,
    },
    roundpending: {
      id: 'idroundpending',
      name: 'Summer Championship',
      status: 'ongoing',
      creator: {
        username: 'pedro',
        avatar: '/__mock__/img/sample-pic2.png',
      },
      winner: null,
      date: '',
      rounds: [
        {
          number: 1,
          status: 'finished',
          brackets: [
            {
              game_id: 'game1',
              participant1: {
                profile: {
                  username: 'alex',
                  avatar: '/__mock__/img/sample-pic3.png',
                },
                alias: 'Nightmare',
                status: 'eliminated',
              },
              participant2: {
                profile: {
                  username: `${username}`,
                  avatar: '/__mock__/img/sample-pic2.png',
                },
                alias: 'Lone Cactus',
                status: 'qualified',
              },
              winner: {
                profile: {
                  username: `${username}`,
                  avatar: '/__mock__/img/sample-pic2.png',
                },
                alias: 'Lone Cactus',
                status: 'qualified',
              },
              status: 'finished',
              score_p1: 3,
              score_p2: 10,
            },
            {
              game_id: 'game2',
              participant1: {
                profile: {
                  username: 'george',
                  avatar: '/__mock__/img/sample-pic1.jpg',
                },
                alias: 'Midnight Rider',
                status: 'qualified',
              },
              participant2: {
                profile: {
                  username: 'alice',
                  avatar: '/img/fefault_avatar.png',
                },
                alias: 'DuskDevil',
                status: 'emilinated',
              },
              winner: {
                profile: {
                  username: 'george',
                  avatar: '/__mock__/img/sample-pic1.jpg',
                },
                alias: 'Midnight Rider',
                status: 'qualified',
              },
              status: 'finished',
              score_p1: 10,
              score_p2: 9,
            },
          ],
        },
        {
          number: 2,
          status: 'pending',
          brackets: [
            {
              game_id: 'game1',
              participant1: {
                profile: {
                  username: 'george',
                  avatar: '/__mock__/img/sample-pic1.jpg',
                },
                alias: 'Midnight Rider',
                status: 'qualified',
              },
              participant2: {
                profile: {
                  username: `${username}`,
                  avatar: '/__mock__/img/sample-pic2.png',
                },
                alias: 'Lone Cactus',
                status: 'qualified',
              },
              winner: null,
              status: 'pending',
              score_p1: 0,
              score_p2: 0,
            },
          ],
        },
      ],
      participants: [
        {
          profile: {
            username: 'alex',
            avatar: '/__mock__/img/sample-pic3.png',
          },
          alias: 'Nightmare',
        },
        {
          profile: {
            username: `${username}`,
            avatar: '/__mock__/img/sample-pic2.png',
          },
          alias: 'Lone Cactus',
        },
        {
          profile: {
            username: 'george',
            avatar: '/__mock__/img/sample-pic1.jpg',
          },
          alias: 'Midnight Rider',
        },
        {
          profile: {
            username: 'alice',
            avatar: '/img/fefault_avatar.png',
          },
          alias: 'DuskDevil',
        },
      ],
      required_participants: 4,
    },
  };
  return data[status] || null;
}
