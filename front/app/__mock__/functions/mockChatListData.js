// Will be replaced by GET /api/chats
export async function mockChatListData() {
  const data = {
    items: [
      {
        chat_id: '1',
        username: 'alice123',
        nickname: 'Alice',
        avatar: '/__mock__/img/sample-pic1.jpg',
        is_online: true,
        is_blocked_user: true,
        is_blocked_by_user: true,
        unread_messages_count: 5,
        last_message: {
          content: 'Nope. See you tomorrow, snackless one! 😆',
          date: '2025-03-04T08:00:00Z',
          sender: 'alice123',
          is_read: false,
          is_liked: true,
          id: '1',
        },
      },
      {
        chat_id: '2',
        username: 'johndoe1',
        nickname: 'JohnDoe',
        avatar: '/__mock__/img/sample-pic2.png',
        is_online: true,
        is_blocked_user: true,
        is_blocked_by_user: true,
        unread_messages_count: 100,
        last_message: {
          content: 'See you tomorrow!',
          date: '2025-03-02T09:00:00Z',
          sender: 'jonhdoe1',
          is_read: false,
          is_liked: true,
          id: '2',
        },
      },
      {
        chat_id: '3',
        username: 'george55',
        nickname: 'George',
        avatar: '/__mock__/img/sample-pic3.png',
        is_online: true,
        is_blocked_user: true,
        is_blocked_by_user: true,
        unread_messages_count: 1,
        last_message: {
          content: 'You know how important this is, and I can\'t afford any mistakes.' +
          'If anything is missing again, we\'ll have a serious problem. 👀',
          date: '2025-02-28T12:00:00Z',
          sender: 'george55',
          is_read: false,
          is_liked: true,
          id: '3',
        },
      },
    ],
    count: 3,
  };
  return data;
}
