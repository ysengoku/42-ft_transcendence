export async function mockTournamentDetail(id) {
  const data = {
    mockidlobby: {
      id: 'mockidlobby',
      name: 'Spring Championship',
      status: 'lobby',
      creator: {
        username: 'pedro',
        nickname: 'pedro',
        avatar: '/__mock__/img/sample-pic2.png',
        elo: 2000,
        is_online: true
      },
      winner: {},
      date: '',
      rounds: [],
      participants: [
        { user: { username: 'alex', nickname: 'Alex', avatar: '/__mock__/img/sample-pic3.png', elo: 1500, is_online: false },
          alias: 'Nightmare', },
        { user: { username: 'user2', nickname: 'Player Two', avatar: '/__mock__/img/sample-pic2.png', elo: 1400, is_online: true },
          alias: 'Lone Cactus',},
        { user: { username: 'user3', nickname: 'Player Three', avatar: '/__mock__/img/sample-pic1.jpg', elo: 1450, is_online: true },
          alias: 'Midnight Rider',},
        { user: { username: 'user4', nickname: 'Player Four', avatar: '/__mock__/img/sample-pic2.png', elo: 1300, is_online: false },
          alias: 'Whiskey Bandit',},
        { user: { username: 'user5', nickname: 'Player Five', avatar: '/__mock__/img/sample-pic3.png', elo: 1350, is_online: true },
          alias: 'LazyFox',},
        { user: { username: 'user6', nickname: 'Player Six', avatar: '/__mock__/img/sample-pic1.jpg', elo: 1200, is_online: true },
          alias: 'DuskDevil',},
      ],
      'required_participants': 8
    },
    mockidongoing: {
      id: 'mockidongoing',
      name: 'Spring Championship',
      status: 'ongoing',
      creator: {
        username: 'pedro',
        nickname: 'Pedro',
        avatar: '/__mock__/img/sample-pic3.png',
        elo: 2000,
        is_online: true
      },
      winner: {},
      date: '2025-05-09T11:43:42.045Z',
      rounds: [
        {
          number: 1,
          status: 'finished',
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
              winner: {
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
              round: 1,
              status: 'finished',
              score_p1: 10,
              score_p2: 5
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
              status: 'ongoing',
              score_p1: 7,
              score_p2: 5
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
              winner: {
                user: {
                  username: 'user5',
                  nickname: 'Player Five',
                  avatar: '/__mock__/img/sample-pic3.png',
                  elo: 1350,
                  is_online: true
                },
                alias: 'DirtyHarry',
              },
              round: 1,
              status: 'finished',
              score_p1: 2,
              score_p2: 1
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
                status: 'won',
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
                status: 'eliminated',
              },
              winner: {
                user: {
                  username: 'user7',
                  nickname: 'Player Seven',
                  avatar: '/__mock__/img/sample-pic3.png',
                  elo: 1250,
                  is_online: true
                },
                alias: 'Gunslinger',
              },
              round: 1,
              status: 'finished',
              score_p1: 2,
              score_p2: 0
            }
          ]
        },
      ],
      participants: [
        { user: { username: 'user1', nickname: 'MidnightRider', avatar: '/__mock__/img/sample-pic3.png', elo: 1500, is_online: false },
          alias: 'MidnightRider', status: 'active', round: 2 },
        { user: { username: 'user2', nickname: 'Player Two', avatar: '/__mock__/img/sample-pic3.png', elo: 1400, is_online: true },
          alias: 'Lone Cactus', status: 'eliminated', round: 1 },
        { user: { username: 'user3', nickname: 'Player Three', avatar: '/__mock__/img/sample-pic3.png', elo: 1450, is_online: true },
          alias: 'LazyFox', status: 'active', round: 2 },
        { user: { username: 'user4', nickname: 'Player Four', avatar: '/__mock__/img/sample-pic3.png', elo: 1300, is_online: false },
          alias: 'DuskDevil', status: 'eliminated', round: 1 },
        { user: { username: 'user5', nickname: 'Player Five', avatar: '/__mock__/img/sample-pic3.png', elo: 1350, is_online: true },
          alias: 'DirtyHarry', status: 'active', round: 2 },
        { user: { username: 'user6', nickname: 'Player Six', avatar: '/__mock__/img/sample-pic3.png', elo: 1200, is_online: true },
          alias: 'CactusJack', status: 'eliminated', round: 1 },
        { user: { username: 'user7', nickname: 'Player Seven', avatar: '/__mock__/img/sample-pic3.png', elo: 1250, is_online: true },
          alias: 'Gunslinger', status: 'active', round: 2 },
        { user: { username: 'user8', nickname: 'Player Eight', avatar: '/__mock__/img/sample-pic3.png', elo: 1100, is_online: false },
          alias: 'Rustler', status: 'eliminated', round: 1 }
      ],
      'required_participants': 8
      },
	  mockidfinished: {
      id: 'mockidfinished',
      name: 'Spring Championship',
      status: 'finished',
      creator: {
        username: 'pedro',
        nickname: 'Pedro',
        avatar: '/__mock__/img/sample-pic3.png',
        elo: 2000,
        is_online: true
      },
      winner: {
        user: {
        username: 'user1',
        nickname: 'MidnightRider',
        avatar: '/__mock__/img/sample-pic2.png',
        elo: 1500,
        is_online: false
        },
        alias: 'MidnightRider',
        status: 'won',
        round: 3
      },
      date: '2025-05-09T11:43:42.045Z',
      rounds: [
        {
          number: 1,
          status: 'finished',
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
              winner: {
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
              round: 1,
              status: 'finished',
              score_p1: 10,
              score_p2: 5
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
                status: 'won',
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
                status: 'eliminated',
              },
              winner: {
                user: {
                  username: 'user3',
                  nickname: 'Player Three',
                  avatar: '/__mock__/img/sample-pic3.png',
                  elo: 1450,
                  is_online: true
                },
                alias: 'LazyFox',
                status: 'won',
              },
              round: 1,
              status: 'finished',
              score_p1: 10,
              score_p2: 5
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
              winner: {
                user: {
                  username: 'user5',
                  nickname: 'Player Five',
                  avatar: '/__mock__/img/sample-pic3.png',
                  elo: 1350,
                  is_online: true
                },
                alias: 'DirtyHarry',
              },
              round: 1,
              status: 'finished',
              score_p1: 2,
              score_p2: 1
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
                status: 'won',
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
                status: 'eliminated',
              },
              winner: {
                user: {
                  username: 'user7',
                  nickname: 'Player Seven',
                  avatar: '/__mock__/img/sample-pic3.png',
                  elo: 1250,
                  is_online: true
                },
                alias: 'Gunslinger',
              },
              round: 1,
              status: 'finished',
              score_p1: 2,
              score_p2: 0
            }
          ]
        },
        {
          number: 2,
          status: 'finished',
          brackets: [
            {
              game_id: 'game5',
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
                  username: 'user3',
                  nickname: 'Player Three',
                  avatar: '/__mock__/img/sample-pic3.png',
                  elo: 1450,
                  is_online: true
                },
                alias: 'LazyFox',
                status: 'eliminated',
              },
              winner: {
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
              round: 2,
              status: 'finished',
              score_p1: 2,
              score_p2: 1
            },
            {
              game_id: 'game6',
              participant1: {
                user: {
                  username: 'user5',
                  nickname: 'Player Five',
                  avatar: '/__mock__/img/sample-pic3.png',
                  elo: 1350,
                  is_online: true,
                },
                alias: 'DirtyHarry',
                status: 'won',
              },
              participant2: {
                user: {
                  username: 'user7',
                  nickname: 'Player Seven',
                  avatar: '/__mock__/img/sample-pic3.png',
                  elo: 1250,
                  is_online: true,
                },
                alias: 'Gunslinger',
                status: 'eliminated',
              },
              winner: {
                user: {
                  username: 'user5',
                  nickname: 'Player Five',
                  avatar: '/__mock__/img/sample-pic3.png',
                  elo: 1350,
                  is_online: true,
                },
                alias: 'DirtyHarry',
                status: 'won',
              },
              round: 2,
              status: 'finished',
              score_p1: 2,
              score_p2: 0
            }
          ]
        },
        {
          number: 3,
          status: 'finished',
          brackets: [
            {
              game_id: 'final',
              participant1: {
                user: {
                  username: 'user1',
                  nickname: 'MidnightRider',
                  avatar: '/__mock__/img/sample-pic3.png',
                  elo: 1500,
                  is_online: false,
                },
                alias: 'MidnightRider',
                status: 'won',
            },
            participant2: {
              user: {
                username: 'user5',
                nickname: 'Player Five',
                avatar: '/__mock__/img/sample-pic3.png',
                elo: 1350,
                is_online: true,
              },
              alias: 'DirtyHarry',
              status: 'eliminated',
            },
            winner: {
              user: {
                username: 'user1',
                nickname: 'MidnightRider',
                avatar: '/__mock__/img/sample-pic3.png',
                elo: 1500,
                is_online: false,
              },
              alias: 'MidnightRider',
              status: 'won',
            },
            round: 3,
            status: 'finished',
            score_p1: 2,
            score_p2: 1
            }
          ]
        }
      ],
      participants: [
        { user: { username: 'user1', nickname: 'MidnightRider', avatar: '/__mock__/img/sample-pic3.png', elo: 1500, is_online: false },
          alias: 'MidnightRider', status: 'active', round: 2 },
        { user: { username: 'user2', nickname: 'Player Two', avatar: '/__mock__/img/sample-pic3.png', elo: 1400, is_online: true },
          alias: 'Lone Cactus', status: 'eliminated', round: 1 },
        { user: { username: 'user3', nickname: 'Player Three', avatar: '/__mock__/img/sample-pic3.png', elo: 1450, is_online: true },
          alias: 'LazyFox', status: 'eliminated', round: 2 },
        { user: { username: 'user4', nickname: 'Player Four', avatar: '/__mock__/img/sample-pic3.png', elo: 1300, is_online: false },
          alias: 'DuskDevil', status: 'eliminated', round: 1 },
        { user: { username: 'user5', nickname: 'Player Five', avatar: '/__mock__/img/sample-pic3.png', elo: 1350, is_online: true },
          alias: 'DirtyHarry', status: 'eliminated', round: 2 },
        { user: { username: 'user6', nickname: 'Player Six', avatar: '/__mock__/img/sample-pic3.png', elo: 1200, is_online: true },
          alias: 'CactusJack', status: 'eliminated', round: 1 },
        { user: { username: 'user7', nickname: 'Player Seven', avatar: '/__mock__/img/sample-pic3.png', elo: 1250, is_online: true },
          alias: 'Gunslinger', status: 'eliminated', round: 2 },
        { user: { username: 'user8', nickname: 'Player Eight', avatar: '/__mock__/img/sample-pic3.png', elo: 1100, is_online: false },
          alias: 'Rustler', status: 'eliminated', round: 1 }
      ],
      'required_participants': 8
      }, 
	};

	return data[id];
}
