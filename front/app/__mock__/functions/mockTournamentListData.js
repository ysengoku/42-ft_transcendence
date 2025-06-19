export async function mockTournamentList() {
  const data = [
    {
      id: 'kagerhnpewn16461gdsga',
      name: 'Peacemakers Cup',
      date: null,
      status: 'lobby',
      tournament_creator: {
        profile: {
          username: 'pedro',
          avatar: '/__mock__/img/sample-pic2.png',
        },
        alias: 'Lone Cactus',
      },
      required_participants: 8,
      participants_count: 3,
    },
    {
      id: 'bqwerty123451234qwe',
      name: 'Valor Clash',
      date: '2025-05-10T15:00:00Z',
      status: 'ongoing',
      tournament_creator: {
        profile: {
          username: 'SarahConno',
          avatar: '/__mock__/img/sample-pic3.png',
        },
        alias: 'Time Traveler',
      },
      required_participants: 8,
      participants_count: 8,
    },
    {
      id: 'cultimate78904567abcdef',
      name: 'Ultimate Throwdown',
      date: '2025-04-20T18:00:00Z',
      status: 'finished',
      tournament_creator: {
        profile: {
          username: 'Morgan',
          avatar: '/__mock__/img/sample-pic1.jpg',
        },
        alias: 'Whisper',
      },
      required_participants: 4,
      participants_count: 4,
      winner: {
        alias: 'SpeedFreak',
        user: {
          username: 'Tommy',
          nickname: 'Speedster',
          avatar: '/__mock__/img/sample-pic2.png',
          elo: 1550,
          is_online: false,
        },
      },
    },
    {
      id: 'dgladiator123asdasd',
      name: "Gladiator's Arena",
      date: null,
      status: 'lobby',
      tournament_creator: {
        profile: {
          username: 'Olivia',
          avatar: '/__mock__/img/sample-pic3.png',
        },
        alias: 'The Hammer',
      },
      required_participants: 4,
      participants_count: 0,
    },
    {
      id: 'esniper45678zxcvbnm',
      name: 'Sniper Showdown',
      date: null,
      status: 'lobby',
      tournament_creator: {
        profile: {
          username: 'Daniel',
          avatar: '/__mock__/img/sample-pic1.jpg',
        },
        alias: 'Eagle Eye',
      },
      required_participants: 8,
      participants_count: 2,
    },
    {
      id: 'fnexus99999poiuytrewq',
      name: 'Nexus Battle',
      date: null,
      status: 'lobby',
      tournament_creator: {
        profile: {
          username: 'Bruce',
          avatar: '/__mock__/img/sample-pic3.png',
        },
        alias: 'he Bat',
      },
      required_participants: 4,
      participants_count: 0,
    },
  ];
  return { items: data, count: data.length };
}
