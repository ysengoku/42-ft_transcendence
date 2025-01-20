export async function simulateFetchUserData(userId) {
	const mockUserData = [
		{ userid: '12345', name: 'JohnDoe', avatar: 'app/media/avatars/default_avatar.png', online: true },
		{ userid: '123', name: 'Alice', avatar: '/media/avatars/default_avatar.png', online: true },
		{ userid: '234', name: 'Jane', avatar: '/media/avatars/default_avatar.png', online: false },
		{ userid: '345', name: 'George', avatar: '/media/avatars/default_avatar.png', online: true },
		{ userid: '456', name: 'Lucas', avatar: '/media/avatars/default_avatar.png', online: false },
		{ userid: '789', name: 'Emily', avatar: '/media/avatars/default_avatar.png', online: true },
	];

	const user = mockUserData.find((user) => user.userid === userId);

	if (!user) {
		return { userid: userId, name: 'Unknown User', avatar: '/media/default_avatar.png', online: false };
	}
	return user;
}
