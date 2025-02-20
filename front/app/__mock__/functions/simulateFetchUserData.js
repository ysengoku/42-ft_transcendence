export function simulateFetchUserData(username) {
  const user1 = {
    username: 'JohnDoe',
    nickname: 'Joooooooohn',
    avatar: '/media/avatars/sample_avatar.jpg',
    email: 'aaa@example.com',
    connection_type: 'regular',
    mfa_enabled: true,
  };

  const user2 = {
    username: 'JohnDoe2',
    nickname: 'Joooooooohn',
    avatar: '/media/avatars/sample_avatar.jpg',
    email: 'bbb@example.com',
    connection_type: 'regular',
    mfa_enabled: false,
  };

  const mockUserData = [user1, user2];

  const user = mockUserData.find((user) => user.username === username);

  if (!user) {
    return {username: 'Unknown User', avatar: '/assets/img/default_avatar.png', online: false};
  }
  return user;
}
