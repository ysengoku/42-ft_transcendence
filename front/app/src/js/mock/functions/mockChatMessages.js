import { auth } from '@auth';

export async function mockChatMessagesData(id) {
  const myUsername = auth.getCashedUser().username;
  const chatMessages = [
    {
      id: 1,
      avatar: '/media/avatars/sample_avatar.jpg',
      username: 'alice123',
      nickname: 'Alice',
      is_online: true,
      messages: [
        {
          id: 1,
          sender: 'alice123',
          message: 'Yo! What\'s up?',
          timestamp: '2025-02-02T12:00:00Z',
        },
        {
          id: 2,
          sender: myUsername,
          message: 'Hey hey! Just surviving another day. You?',
          timestamp: '2025-02-02T12:01:00Z',
        },
        {
          id: 3,
          sender: 'alice123',
          message: 'Feeling like a rockstar today! 😎',
          timestamp: '2025-02-02T12:02:00Z',
        },
        {
          id: 4,
          sender: myUsername,
          message: 'Nice! Hope that energy lasts until tomorrow 😆',
          timestamp: '2025-02-02T12:03:00Z',
        },
        {
          id: 5,
          sender: 'alice123',
          message: 'Haha, we’ll see! Catch you later!',
          timestamp: '2025-02-02T12:04:00Z',
        },
        {
          id: 6,
          sender: myUsername,
          message: 'Later! Don’t forget to bring snacks. 🤓',
          timestamp: '2025-02-02T12:05:00Z',
        },
        {
          id: 7,
          sender: 'alice123',
          message: 'Of course! What kind of monster do you think I am?! 🍫',
          timestamp: '2025-02-02T12:06:00Z',
        },
        {
          id: 8,
          sender: myUsername,
          message: 'Just making sure. Last time you showed up empty-handed. 👀',
          timestamp: '2025-02-02T12:07:00Z',
        },
        {
          id: 9,
          sender: 'alice123',
          message: 'That was ONE TIME! Never letting that go, huh? 😂',
          timestamp: '2025-02-02T12:08:00Z',
        },
        {
          id: 10,
          sender: myUsername,
          message: 'Nope. See you tomorrow, snackless one! 😆',
          timestamp: '2025-02-02T12:09:00Z',
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
          sender: myUsername,
          message: 'See you tomorrow!',
          timestamp: '2025-01-31T12:00:00Z',
        },
        {
          sender: 'johndoe55',
          message: 'See you!',
          timestamp: '2025-01-31T12:01:00Z',
        },
        {
          sender: myUsername,
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
          sender: myUsername,
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
