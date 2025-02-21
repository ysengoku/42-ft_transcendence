export function mockRegisterSuccessResponse() {
  return {
    user: {
      username: 'JohnDoe',
      avatar: '/static/images/avatars/avatar.png',
      elo: 1000,
      is_online: true,
    },
  };
}
