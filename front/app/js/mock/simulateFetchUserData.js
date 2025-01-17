export async function simulateFetchUserData(username) {
	const mockUserData = [
		{ username: 'JohnDoe', avatar: '/assets/img/avatars/sample_avatar.jpg', online: true },
		{ username: 'Alice', avatar: '/assets/img/avatars/sample_avatar2.jpg', online: true },
		{ username: 'Jane', avatar: '/assets/img/avatars/sample_avatar3.jpg', online: false },
		{ username: 'George', avatar: '/assets/img/avatars/sample_avatar.jpg', online: true },
		{ username: 'Lucas', avatar: '/assets/img/avatars/sample_avatar.jpg', online: false },
		{ username: 'Emily', avatar: '/assets/img/avatars/sample_avatar.jpg', online: true },
	  ];

	const user = mockUserData.find((user) => user.username === username);

	if (!user) {
		return { username: 'Unknown User', avatar: '/assets/img/avatars/sample_avatar.jpg', online: false };
	}
	return user;
}
