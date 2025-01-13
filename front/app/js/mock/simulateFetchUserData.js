export async function simulateFetchUserData(userId) {
	const mockUserData = {
		id: userId,
		name: 'John Doe',
		avatar: '/assets/img/sample_avatar.jpg',
		isOnline: true,
	  };
	  return mockUserData;
}
