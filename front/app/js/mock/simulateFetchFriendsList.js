export async function simulateFetchFriendsList() {
  const mockFriendsData = [
    { name: 'John', avatar: '/assets/img/sample_avatar.jpg', online: true },
    { name: 'Jane', avatar: '/assets/img/sample_avatar.jpg', online: false },
    { name: 'George', avatar: '/assets/img/sample_avatar.jpg', online: true },
    { name: 'Lucas', avatar: '/assets/img/sample_avatar.jpg', online: false },
    { name: 'Emily', avatar: '/assets/img/sample_avatar.jpg', online: true }
  ];

  return mockFriendsData;
}
