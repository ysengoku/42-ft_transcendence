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

// export async function simulateApiLogin(credentials) {
//   console.log('inputUsername:', credentials.username);
//   console.log('inputPassword:', credentials.password);
//   return new Promise((resolve) => {
//     setTimeout(() => {
//       if (credentials.username === 'test' && credentials.password === 'password') {
//         console.log('Login successful');
//         resolve({
//           success: true,
//           user: {
//             username: 'JohnDoe',
//             avatar: '/mock/img/avatars/sample_avatar.jpg',
//           },
//         });
//       } else {
//         console.log('Login failed');
//         resolve({
//           success: false,
//           message: 'Invalid username or password',
//         });
//       }
//     }, 500);
//   });
// }
