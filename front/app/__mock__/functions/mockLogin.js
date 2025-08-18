export async function simulateLoginSuccessResponse() {
  return {
    user: {
      username: 'JohnDoe',
      avatar: '/media/avatars/sample_avatar.jpg',
      elo: 1000,
      is_online: true,
    },
  };
}
