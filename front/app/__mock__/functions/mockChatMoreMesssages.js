// Will be repplaced by GET /api/chats/{username}/messages
import { auth } from '@auth';
export async function mockChatMoreMessages(username) {
  const myUsername = auth.getStoredUser().username;
  const chatMessages = [
    {
      username: 'alice123',
      items: [
        {
          sender: myUsername,
          content: 'test1',
          date: '2025-02-02T12:09:00Z',
          is_liked: false,
          is_read: true,
          id: '10',
        },
        {
          sender: 'alice123',
          content: 'test2',
          date: '2025-02-02T12:08:00Z',
          is_liked: true,
          is_read: true,
          id: '9',
        },
        {
          sender: myUsername,
          content: 'test3',
          date: '2025-02-02T12:07:00Z',
          is_liked: false,
          is_read: true,
          id: '8',
        },
        {
          sender: 'alice123',
          content: 'test4',
          date: '2025-02-02T12:06:00Z',
          is_liked: false,
          is_read: true,
          id: '7',
        },
        {
          sender: myUsername,
          content: 'test5',
          date: '2025-02-02T12:05:00Z',
          is_liked: true,
          is_read: true,
          id: '6',
        },
        {
          sender: 'alice123',
          content: 'test6',
          date: '2025-02-02T12:04:00Z',
          is_liked: false,
          is_read: true,
          id: '5',
        },
        {
          sender: myUsername,
          content: 'test7',
          date: '2025-02-02T12:03:00Z',
          is_liked: false,
          is_read: true,
          id: '4',
        },
        {
          sender: 'alice123',
          content: 'test8',
          date: '2025-02-02T12:02:00Z',
          is_liked: false,
          is_read: true,
          id: '3',
        },
        {
          sender: myUsername,
          content: 'test9',
          date: '2025-02-02T12:01:00Z',
          is_liked: false,
          is_read: true,
          id: '2',
        },
        {
          content: 'test10',
          date: '2025-02-02T12:00:00Z',
          sender: 'alice123',
          is_read: true,
          is_liked: false,
          id: '1',
        },
      ],
      count: 30,
    },
    {
      username: 'johndoe1',
      items: [
        {
          sender: myUsername,
          content: 'test',
          date: '2025-02-02T12:00:00Z',
          is_liked: false,
          is_read: true,
        },
        {
          sender: 'johndoe1',
          content: 'test',
          date: '2025-02-02T12:00:00Z',
          is_liked: false,
          is_read: true,
        },
        {
          sender: myUsername,
          content: 'test',
          date: '2025-02-02T12:00:00Z',
          is_liked: false,
          is_read: true,
        },
      ],
      count: 3,
    },
    {
      username: 'george55',
      items: [
        {
          sender: 'george55',
          content: 'test',
          date: '2025-02-02T12:00:00Z',
          is_liked: false,
          is_read: true,
        },
        {
          sender: myUsername,
          content: 'test',
          date: '2025-01-20T12:01:00Z',
          is_liked: false,
          is_read: true,
        },
        {
          sender: 'george55',
          content: 'test',
          date: '2025-01-20T12:00:00Z',
          is_liked: false,
          is_read: true,
        },
      ],
      count: 3,
    },
  ];

  for (const chat of chatMessages) {
    if (chat.username === username) {
      return chat;
    }
  }
}
