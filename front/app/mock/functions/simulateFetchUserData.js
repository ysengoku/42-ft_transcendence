export async function simulateFetchUserData(username) {
	const user1 = {
		username: 'JohnDoe', 
		avatar: '/media/default_avatar.png',
		hasOwnAvatar: true,
		email: 'johndoe@example.com'
	  };
	  
	const user2 = {
		username: 'Alice', 
		avatar: '/mock/img/avatars/sample_avatar2.jpg',
		hasOwnAvatar: true,
		email: 'alice@example.com'
	};

	const user3 = {
		username: 'Jane', 
		avatar: '/mock/img/avatars/sample_avatar3.jpg',
		hasOwnAvatar: false,
		email: 'jane@example.com'
	  };
	  
	const user4 = {
		username: 'George', 
		avatar: '/mock/img/avatars/sample_avatar.jpg',
		hasOwnAvatar: false,
		email: 'george@example.com'
	  };
	  
	const user5 = {
		username: 'Lucas', 
		avatar: '/mock/img/avatars/sample_avatar4.jpg',
		hasOwnAvatar: true,
		email: 'lucas@example.com'
	  };
	  
	  
	const mockUserData = [user1, user2, user3, user4, user5];

	const user = mockUserData.find((user) => user.username === username);

	if (!user) {
		return { username: 'Unknown User', avatar: '/mock/img/avatars/sample_avatar.jpg', online: false };
	}
	return user;
}
