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
      is_read: false,
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
      is_read: false,
    },
    {
      id: 'aggehs135',
      action: 'new_friend',
      data: {
        username: 'perdo1',
        nickname: 'Pedro1',
        avatar: '/__mock__/img/sample-pic3.png',
        date: '2025-03-04T08:25:00Z',
      },
      is_read: false,
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
      is_read: false,
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
      is_read: false,
    },
    {
      id: 'aggehs135',
      action: 'new_friend',
      data: {
        username: 'perdo2',
        nickname: 'Pedro2',
        avatar: '/__mock__/img/sample-pic3.png',
        date: '2025-03-04T08:25:00Z',
      },
      is_read: false,
    },
  ];

  const data = {
    items: items,
    // count: items.length,
    count: 20,
  };
  return data;
}
