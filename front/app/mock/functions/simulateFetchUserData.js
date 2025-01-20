export async function simulateFetchUserData(username) {
	const mockUserData = [
		{ username: 'JohnDoe', avatar: '/mock/img/avatars/sample_avatar.jpg', online: true },
		{ username: 'Alice', avatar: '/mock/img/avatars/sample_avatar2.jpg', online: true },
		{ username: 'Jane', avatar: '/mock/img/avatars/sample_avatar3.jpg', online: false },
		{ username: 'George', avatar: '/mock/img/avatars/sample_avatar.jpg', online: true },
		{ username: 'Lucas', avatar: '/mock/img/avatars/sample_avatar.jpg', online: false },
		{ username: 'Emily', avatar: '/mock/img/avatars/sample_avatar.jpg', online: true },
	  ];

	const user = mockUserData.find((user) => user.username === username);

	if (!user) {
		return { username: 'Unknown User', avatar: '/mock/img/avatars/sample_avatar.jpg', online: false };
	}
	return user;
}
