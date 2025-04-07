export async function mockNotificationsData() {
  const items = [
    {
      id: 'aggehs135',
      action: 'game_invite',
      data: {
        username: 'alice123',
        nickname: 'Alice',
        avatar: '/__mock__/img/sample-pic1.jpg',
        date: '2025-03-13T08:00:00Z',
        game_id: '100',
      },
    },
    {
      id: 'angsfee456',
      action: 'new_tournament',
      data: {
        nickname: 'JohnDoe',
        avatar: '/__mock__/img/sample-pic2.png',
        date: '2025-03-11T11:32:00Z',
        tournament_id: '25',
        tournament_name: 'Peacemakers Cup',
      },
    },
    {
      id: 'aggehs135',
      action: 'new_friend',
      data: {
        username: 'perdo',
        nickname: 'Pedro',
        avatar: '/__mock__/img/sample-pic3.png',
        date: '2025-03-04T08:25:00Z',
      },
    },
    {
      id: 'aggehs135',
      action: 'game_invite',
      data: {
        username: 'alice123',
        nickname: 'Alice',
        avatar: '/__mock__/img/sample-pic1.jpg',
        date: '2025-03-13T08:00:00Z',
        game_id: '100',
      },
    },
    {
      id: 'angsfee456',
      action: 'new_tournament',
      data: {
        nickname: 'JohnDoe',
        avatar: '/__mock__/img/sample-pic2.png',
        date: '2025-03-11T11:32:00Z',
        tournament_id: '25',
        tournament_name: 'Peacemakers Cup',
      },
    },
    {
      id: 'aggehs135',
      action: 'new_friend',
      data: {
        username: 'perdo',
        nickname: 'Pedro',
        avatar: '/__mock__/img/sample-pic3.png',
        date: '2025-03-04T08:25:00Z',
      },
    },
  ];

  const data = {
    items: items,
    // count: items.length,
    count: 20,
  };
  return data;
}
