export function mockFetchTournamentHistory() {
  const mockTournamentHistory = [
    {
      name: 'Peacemakers Cup',
      date: '2025-01-25T12:00:00Z',
      winner: {
        avatar: '/__mock__/img/sample-pic2.png',
        username: 'GeorgeLucas',
        nickname: 'The Legend',
      },
      participants: '8',
      status: 'Finished',
    },
    {
      name: 'Champions League',
      date: '2025-02-10T15:30:00Z',
      winner: {
        avatar: '/__mock__/img/sample-pic3.png',
        username: 'SkyWalker99',
        nickname: 'Jedi Master',
      },
      participants: '16',
      status: 'Finished',
    },
    {
      name: 'Warriors Showdown',
      date: '2025-03-05T18:45:00Z',
      winner: {
        avatar: '/__mock__/img/sample-pic1.jpg',
        username: 'ShadowFang',
        nickname: 'The Phantom',
      },
      participants: '32',
      status: 'Finished',
    },
    {
      name: 'Elite Battle Royale',
      date: '2025-04-15T20:00:00Z',
      winner: null,
      participants: '8',
      status: 'Ongoing',
    },
  ];
  return mockTournamentHistory;
}
