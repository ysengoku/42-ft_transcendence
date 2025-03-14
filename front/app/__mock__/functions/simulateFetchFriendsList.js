export async function simulateFetchFriendsList() {
  const mockFriendsData = [
    {
      username: 'Alice',
      nickname: 'Aliceeeeee',
      avatar: '/media/avatars/sample_avatar2.jpg',
      online: true,
    },
    {
      username: 'Jane',
      nickname: 'Janey',
      avatar: '/media/avatars/sample_avatar3.jpg',
      online: false,
    },
    {
      username: 'George',
      nickname: 'Georgie',
      avatar: '/media/avatars/sample_avatar.jpg',
      online: true,
    },
    {
      username: 'Lucas',
      nickname: 'Lucy',
      avatar: '/media/avatars/sample_avatar.jpg',
      online: false,
    },
    {
      username: 'Emily',
      nickname: 'Emmy',
      avatar: '/media/avatars/sample_avatar.jpg',
      online: true,
    },
  ];

  return mockFriendsData;
}
