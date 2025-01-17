export async function simulateFetchFriendsList() {
  const mockFriendsData = [
    { username: 'Alice', avatar: '/assets/img/avatars/sample_avatar2.jpg', online: true },
    { username: 'Jane', avatar: '/assets/img/avatars/sample_avatar3.jpg', online: false },
    { username: 'George', avatar: '/assets/img/avatars/sample_avatar.jpg', online: true },
    { username: 'Lucas', avatar: '/assets/img/avatars/sample_avatar.jpg', online: false },
    { username: 'Emily', avatar: '/assets/img/avatars/sample_avatar.jpg', online: true }
  ];

  return mockFriendsData;
}
