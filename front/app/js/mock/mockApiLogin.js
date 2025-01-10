export async function simulateApiLogin(credentials) {
	return new Promise((resolve) => {
		setTimeout(() => {
			if (credentials.username === 'test' && credentials.password === 'password') {
				resolve({
					success: true,
					user: {
						id: '12345',
						name: 'John Doe',
						email: 'john.doe@example.com',
					},
				});
			} else {
				resolve({
					success: false,
					message: 'Invalid username or password',
				});
			}
		}, 500);
	});
}
