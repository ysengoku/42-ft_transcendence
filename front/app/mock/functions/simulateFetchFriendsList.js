export async function simulateFetchFriendsList() {
  const mockFriendsData = [
    { username: 'Alice', avatar: '/mock/media/avatars/sample_avatar2.jpg', online: true },
    { username: 'Jane', avatar: '/mock/media/avatars/sample_avatar3.jpg', online: false },
    { username: 'George', avatar: '/mock/media/avatars/sample_avatar.jpg', online: true },
    { username: 'Lucas', avatar: '/mock/media/avatars/sample_avatar.jpg', online: false },
    { username: 'Emily', avatar: '/mock/media/avatars/sample_avatar.jpg', online: true }
  ];

  return mockFriendsData;
}
