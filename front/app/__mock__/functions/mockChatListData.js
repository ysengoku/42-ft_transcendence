export async function mockChatListData() {
  const chatList = [
    {
      id: 1,
      avatar: '/__mock__/img/sample-pic1.jpg',
      username: 'alice123',
      nickname: 'Alice',
      last_message_time: '2025-02-05T08:00:00Z',
      last_message: 'Nope. See you tomorrow, snackless one! 😆',
      unread_messages: 5,
    },
    {
      id: 2,
      avatar: '/__mock__/img/sample-pic2.png',
      username: 'johndoe1',
      nickname: 'JohnDoe',
      last_message_time: '2025-02-04T09:00:00Z',
      last_message: 'See you tomorrow!',
      unread_messages: 100,
    },
    {
      id: 3,
      avatar: '/__mock__/img/sample-pic3.png',
      username: 'george55',
      nickname: 'George',
      last_message_time: '2025-01-20T12:00:00Z',
      last_message: 'Did you get my email?',
      unread_messages: 1,
    },
  ];
  return chatList;
}
