export async function simulateFetchFriendsList() {
  const mockFriendsData = [
    { userid: '123', name: 'Alice', avatar: '/assets/img/sample_avatar2.jpg', online: true },
    { userid: '234', name: 'Jane', avatar: '/assets/img/sample_avatar3.jpg', online: false },
    { userid: '345', name: 'George', avatar: '/assets/img/sample_avatar.jpg', online: true },
    { userid: '456', name: 'Lucas', avatar: '/assets/img/sample_avatar.jpg', online: false },
    { userid: '789', name: 'Emily', avatar: '/assets/img/sample_avatar.jpg', online: true }
  ];

  return mockFriendsData;
}
