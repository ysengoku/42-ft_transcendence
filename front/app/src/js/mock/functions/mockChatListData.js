export async function mockChatListData() {
  const chatList = [
    {
      id: 1,
      avatar: '/media/avatars/sample_avatar.jpg',
      username: 'alice123',
      nickname: 'Alice',
      last_message_time: '2025-02-05T08:00:00Z',
      last_message: "Hey, how's it going?",
      unread_messages: 100,
    },
    {
      id: 2,
      avatar: '/media/avatars/sample_avatar2.jpg',
      username: 'johndoe1',
      nickname: 'JohnDoe',
      last_message_time: '2025-02-04T09:00:00Z',
      last_message: 'See you tomorrow!',
      unread_messages: 0,
    },
    {
      id: 3,
      avatar: '/media/avatars/sample_avatar3.jpg',
      username: 'george55',
      nickname: 'George',
      last_message_time: '2025-01-20T12:00:00Z',
      last_message: 'Did you get my email?',
      unread_messages: 1,
    },
  ];
  return chatList;
}
