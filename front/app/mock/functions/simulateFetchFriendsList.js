export async function simulateFetchFriendsList() {
  const mockFriendsData = [
    { username: 'Alice', avatar: '/mock/img/avatars/sample_avatar2.jpg', online: true },
    { username: 'Jane', avatar: '/mock/img/avatars/sample_avatar3.jpg', online: false },
    { username: 'George', avatar: '/mock/img/avatars/sample_avatar.jpg', online: true },
    { username: 'Lucas', avatar: '/mock/img/avatars/sample_avatar.jpg', online: false },
    { username: 'Emily', avatar: '/mock/img/avatars/sample_avatar.jpg', online: true }
  ];

  return mockFriendsData;
}
