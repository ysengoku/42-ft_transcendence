export async function simulateFetchUserProfile(username) {
	const user1 = {
		username: 'JohnDoe', 
		avatar: '/media/default_avatar.png', 
		is_online: true,
		elo: 1200, 
		wins: 45, 
		loses: 30, 
		winrate: 60, 
		scored_balls: 500, 
		date_joined: '2021-01-15', 
		best_enemy: { username: 'Alice', avatar: '/mock/img/avatars/sample_avatar2.jpg', wins: 20, loses: 10, winrate: 67, elo: 1100 }, 
		worst_enemy: { username: 'George', avatar: '/mock/img/avatars/sample_avatar3.jpg', wins: 10, loses: 25, winrate: 28, elo: 900 },
		friends: [
		  { username: 'Alice', avatar: '/mock/img/avatars/sample_avatar2.jpg', elo: 1100, is_online: true },
		  { username: 'George', avatar: '/mock/img/avatars/sample_avatar3.jpg', elo: 950, is_online: false },
		  { username: 'Lucas', avatar: '/mock/img/avatars/sample_avatar4.jpg', elo: 1000, is_online: true }
		]
	  };
	  
	const user2 = {
		username: 'Alice', 
		avatar: '/mock/img/avatars/sample_avatar2.jpg', 
		online: true,
		elo: 1100, 
		wins: 30, 
		loses: 40, 
		winrate: 43, 
		scored_balls: 450, 
		date_joined: '2020-03-10', 
		best_enemy: { username: 'JohnDoe', avatar: '/mock/img/avatars/sample_avatar.jpg', wins: 15, loses: 10, winrate: 60, elo: 1200 }, 
		worst_enemy: { username: 'Emily', avatar: '/mock/img/avatars/sample_avatar.jpg', wins: 8, loses: 20, winrate: 30, elo: 950 },
		friends: [
		  { username: 'JohnDoe', avatar: '/mock/img/avatars/sample_avatar.jpg', elo: 1200, is_online: true },
		  { username: 'George', avatar: '/mock/img/avatars/sample_avatar3.jpg', elo: 950, is_online: false },
		  { username: 'Lucas', avatar: '/mock/img/avatars/sample_avatar4.jpg', elo: 1000, is_online: true }
		]
	};

	const user3 = {
		username: 'Jane', 
		avatar: '/mock/img/avatars/sample_avatar3.jpg', 
		online: false,
		elo: 1050, 
		wins: 25, 
		loses: 35, 
		winrate: 42, 
		scored_balls: 400, 
		date_joined: '2021-05-22', 
		best_enemy: { username: 'Lucas', avatar: '/mock/img/avatars/sample_avatar4.jpg', wins: 20, loses: 15, winrate: 57, elo: 1000 }, 
		worst_enemy: { username: 'Emily', avatar: '/mock/img/avatars/sample_avatar.jpg', wins: 10, loses: 25, winrate: 28, elo: 950 },
		friends: [
		  { username: 'George', avatar: '/mock/img/avatars/sample_avatar.jpg', elo: 1100, is_online: true },
		  { username: 'Emily', avatar: '/mock/img/avatars/sample_avatar.jpg', elo: 950, is_online: true },
		  { username: 'Alice', avatar: '/mock/img/avatars/sample_avatar2.jpg', elo: 1150, is_online: true }
		]
	  };
	  
	const user4 = {
		username: 'George', 
		avatar: '/mock/img/avatars/sample_avatar.jpg', 
		online: true,
		elo: 1100, 
		wins: 40, 
		loses: 25, 
		winrate: 61, 
		scored_balls: 480, 
		date_joined: '2019-07-13', 
		best_enemy: { username: 'Lucas', avatar: '/mock/img/avatars/sample_avatar4.jpg', wins: 25, loses: 15, winrate: 62, elo: 1050 }, 
		worst_enemy: { username: 'Jane', avatar: '/mock/img/avatars/sample_avatar3.jpg', wins: 5, loses: 15, winrate: 25, elo: 950 },
		friends: [
		  { username: 'Alice', avatar: '/mock/img/avatars/sample_avatar2.jpg', elo: 1150, is_online: true },
		  { username: 'Emily', avatar: '/mock/img/avatars/sample_avatar.jpg', elo: 950, is_online: true },
		  { username: 'Jane', avatar: '/mock/img/avatars/sample_avatar3.jpg', elo: 1050, is_online: false }
		]
	  };
	  
	const user5 = {
		username: 'Lucas', 
		avatar: '/mock/img/avatars/sample_avatar4.jpg', 
		online: false,
		elo: 1000, 
		wins: 20, 
		loses: 30, 
		winrate: 40, 
		scored_balls: 350, 
		date_joined: '2022-02-17', 
		best_enemy: { username: 'Jane', avatar: '/mock/img/avatars/sample_avatar3.jpg', wins: 25, loses: 15, winrate: 57, elo: 1050 }, 
		worst_enemy: { username: 'Emily', avatar: '/mock/img/avatars/sample_avatar.jpg', wins: 10, loses: 20, winrate: 33, elo: 950 },
		friends: [
		  { username: 'JohnDoe', avatar: '/mock/img/avatars/sample_avatar.jpg', elo: 1200, is_online: true },
		  { username: 'Emily', avatar: '/mock/img/avatars/sample_avatar.jpg', elo: 950, is_online: true },
		  { username: 'Alice', avatar: '/mock/img/avatars/sample_avatar2.jpg', elo: 1150, is_online: false }
		]
	  };
	  
	const user6 = {
		username: 'Emily', 
		avatar: '/mock/img/avatars/sample_avatar.jpg', 
		online: true,
		elo: 950, 
		wins: 30, 
		loses: 45, 
		winrate: 40, 
		scored_balls: 420, 
		date_joined: '2020-09-05', 
		best_enemy: { username: 'George', avatar: '/mock/img/avatars/sample_avatar.jpg', wins: 10, loses: 20, winrate: 33, elo: 1100 }, 
		worst_enemy: { username: 'Lucas', avatar: '/mock/img/avatars/sample_avatar4.jpg', wins: 5, loses: 10, winrate: 33, elo: 1000 },
		friends: [
		  { username: 'JohnDoe', avatar: '/mock/img/avatars/sample_avatar.jpg', elo: 1200, is_online: true },
		  { username: 'Jane', avatar: '/mock/img/avatars/sample_avatar3.jpg', elo: 1050, is_online: false },
		  { username: 'Alice', avatar: '/mock/img/avatars/sample_avatar2.jpg', elo: 1150, is_online: true }
		]
	  };
	  
	  
	const mockUserData = [user1, user2, user3, user4, user5, user6];

	const user = mockUserData.find((user) => user.username === username);

	if (!user) {
		return { username: 'Unknown User', avatar: '/mock/img/avatars/sample_avatar.jpg', online: false };
	}
	return user;
}
