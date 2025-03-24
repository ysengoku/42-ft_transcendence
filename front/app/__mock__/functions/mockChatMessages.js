// Will be replaced by PUT /api/chats/{username}
import { auth } from '@auth';

export async function mockChatMessagesData(username) {
  const myUsername = auth.getStoredUser().username;
  const chatMessages = [
    {
      chat_id: '1',
      username: 'alice123',
      nickname: 'Alice',
      avatar: '/__mock__/img/sample-pic1.jpg',
      is_online: true,
      is_blocked_user: true,
      is_blocked_by_user: true,
      messages: [
        {
          sender: myUsername,
          content: 'Nope. See you tomorrow, snackless one! 😆',
          date: '2025-02-02T12:09:00Z',
          is_liked: false,
          is_read: true,
          id: '10',
        },
        {
          sender: 'alice123',
          content: 'That was ONE TIME! Never letting that go, huh? 😂',
          date: '2025-02-02T12:08:00Z',
          is_liked: true,
          is_read: true,
          id: '9',
        },
        {
          sender: myUsername,
          content: 'Just making sure. Last time you showed up empty-handed. ' +
          'I don\'t want a repeat of that situation, ' +
          'so I need to confirm everything is in order.' +
          'You know how important this is, and I can\'t afford any mistakes.' +
          'If anything is missing again, we\'ll have a serious problem. 👀',
          date: '2025-02-02T12:07:00Z',
          is_liked: false,
          is_read: true,
          id: '8',
        },
        {
          sender: 'alice123',
          content: 'Of course! What kind of monster do you think I am?! 🍫',
          date: '2025-02-02T12:06:00Z',
          is_liked: false,
          is_read: true,
          id: '7',
        },
        {
          sender: myUsername,
          content: 'Later! Don\'t forget to bring snacks. 🤓',
          date: '2025-02-02T12:05:00Z',
          is_liked: true,
          is_read: true,
          id: '6',
        },
        {
          sender: 'alice123',
          content: 'Haha, we\'ll see! Catch you later!',
          date: '2025-02-02T12:04:00Z',
          is_liked: false,
          is_read: true,
          id: '5',
        },
        {
          sender: myUsername,
          content: 'Nice! Hope that energy lasts until tomorrow 😆',
          date: '2025-02-02T12:03:00Z',
          is_liked: false,
          is_read: true,
          id: '4',
        },
        {
          sender: 'alice123',
          content: 'Feeling like a rockstar today! 😎',
          date: '2025-02-02T12:02:00Z',
          is_liked: false,
          is_read: true,
          id: '3',
        },
        {
          sender: myUsername,
          content: 'Hey hey! Just surviving another day. You?',
          date: '2025-02-02T12:01:00Z',
          is_liked: false,
          is_read: true,
          id: '2',
        },
        {
          content: 'Yo! What\'s up?',
          date: '2025-02-02T12:00:00Z',
          sender: 'alice123',
          is_read: true,
          is_liked: false,
          id: '1',
        },
      ],
    },
    {
      chat_id: '2',
      username: 'johndoe1',
      nickname: 'JohnDoe',
      avatar: '/__mock__/img/sample-pic2.png',
      is_online: true,
      is_blocked_user: true,
      is_blocked_by_user: true,
      messages: [
        {
          sender: myUsername,
          content: 'Bye!',
          date: '2025-01-31T12:02:00Z',
          is_liked: false,
          is_read: true,
        },
        {
          sender: 'johndoe1',
          content: 'See you!',
          date: '2025-01-31T12:01:00Z',
          is_liked: false,
          is_read: true,
        },
        {
          sender: myUsername,
          content: 'See you tomorrow!',
          date: '2025-01-31T12:00:00Z',
          is_liked: false,
          is_read: true,
        },
      ],
    },
    {
      chat_id: '3',
      username: 'george55',
      nickname: 'George',
      avatar: '/__mock__/img/sample-pic3.png',
      is_online: true,
      is_blocked_user: true,
      is_blocked_by_user: true,
      messages: [
        {
          sender: 'george55',
          content: 'Great, thanks!',
          date: '2025-01-20T12:02:00Z',
          is_liked: false,
          is_read: true,
        },
        {
          sender: myUsername,
          content: 'Yes, I did. I will reply soon.',
          date: '2025-01-20T12:01:00Z',
          is_liked: false,
          is_read: true,
        },
        {
          sender: 'george55',
          content: 'Did you get my email?',
          date: '2025-01-20T12:00:00Z',
          is_liked: false,
          is_read: true,
        },
      ],
    },
  ];

  for (const chat of chatMessages) {
    if (chat.username === username) {
      return chat;
    }
  }
}
