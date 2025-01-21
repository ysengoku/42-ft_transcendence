export async function simulateFetchUserData(username) {
	const user1 = {
		username: 'JohnDoe', 
		avatar: '/media/default_avatar.png', 
		email: 'johndoe@example.com'
	  };
	  
	const user2 = {
		username: 'Alice', 
		avatar: '/mock/img/avatars/sample_avatar2.jpg', 
		email: 'alice@example.com'
	};

	const user3 = {
		username: 'Jane', 
		avatar: '/mock/img/avatars/sample_avatar3.jpg', 
		email: 'jane@example.com'
	  };
	  
	const user4 = {
		username: 'George', 
		avatar: '/mock/img/avatars/sample_avatar.jpg', 
		email: 'george@example.com'
	  };
	  
	const user5 = {
		username: 'Lucas', 
		avatar: '/mock/img/avatars/sample_avatar4.jpg', 
		email: 'lucas@example.com'
	  };
	  
	  
	const mockUserData = [user1, user2, user3, user4, user5];

	const user = mockUserData.find((user) => user.username === username);

	if (!user) {
		return { username: 'Unknown User', avatar: '/mock/img/avatars/sample_avatar.jpg', online: false };
	}
	return user;
}
