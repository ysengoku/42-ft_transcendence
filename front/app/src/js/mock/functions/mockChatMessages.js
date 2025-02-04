export async function mockChatMessagesData(id) {
  // console.log('ID is searched: ', id);
  let chatMessages = [
    {
      id: 1,
      avatar: '/media/avatars/sample_avatar.jpg',
      username: 'alice@123',
      nickname: 'Alice',
      is_online: true,
      messages: [
        {
          id: 1,
          sender: 'alice123',
          message: "Hey, how's it going?",
          timestamp: '2025-02-02T12:00:00Z',
        },
        {
          id: 2,
          sender: 'johndoe2',
          message: "Hey! I'm good. How about you?",
          timestamp: '2025-02-02T12:01:00Z',
        },
        {
          id: 3,
          sender: 'alice123',
          message: "I'm great, thanks for asking!",
          timestamp: '2025-02-02T12:02:00Z',
        },
        {
          id: 4,
          sender: 'johndoe2',
          message: 'See you tomorrow!',
          timestamp: '2025-02-02T12:03:00Z',
        },
      ],
    },
    {
      id: 2,
      avatar: '/media/avatars/sample_avatar2.jpg',
      username: 'johndoe55',
      nickname: 'JohnDoe',
      is_online: false,
      messages: [
        {
          sender: 'johndoe2',
          message: 'See you tomorrow!',
          timestamp: '2025-01-31T12:00:00Z',
        },
        {
          sender: 'johndoe55',
          message: 'See you!',
          timestamp: '2025-01-31T12:01:00Z',
        },
        {
          sender: 'johndoe2',
          message: 'Bye!',
          timestamp: '2025-01-31T12:02:00Z',
        },
      ],
    },
    {
      id: 3,
      avatar: '/media/avatars/sample_avatar3.jpg',
      username: 'george55',
      nickname: 'George',
      is_online: true,
      messages: [
        {
          sender: 'george55',
          message: 'Did you get my email?',
          timestamp: '2025-01-20T12:00:00Z',
        },
        {
          sender: 'johndoe2',
          message: 'Yes, I did. I will reply soon.',
          timestamp: '2025-01-20T12:01:00Z',
        },
        {
          sender: 'george55',
          message: 'Great, thanks!',
          timestamp: '2025-01-20T12:02:00Z',
        },
      ],
    },
  ];

  for (const chat of chatMessages) {
    if (Number(chat.id) === Number(id)) {
      return chat;
    }
  }
}
