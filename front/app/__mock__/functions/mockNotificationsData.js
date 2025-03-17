export async function mockNotificationsData() {
  const data = [
    {
      type: 'game_invite',
      data: {
        id: '100',
        date: '2025-03-13T08:00:00Z',
        username: 'alice123',
        nickname: 'Alice',
        avatar: '/__mock__/img/sample-pic1.jpg',
      },
    },
    {
      type: 'new_tournament',
      data: {
        id: '25',
        date: '2025-03-11T11:32:00Z',
        tournament_name: 'Peacemakers Cup',
        nickname: 'JohnDoe',
        avatar: '/__mock__/img/sample-pic2.png',
      },
    },
    {
      type: 'new_friend',
      data: {
        date: '2025-03-04T08:25:00Z',
        username: 'perdo',
        nickname: 'Pedro',
        avatar: '/__mock__/img/sample-pic3.png',
      },
    },
  ];

  return data;
}
