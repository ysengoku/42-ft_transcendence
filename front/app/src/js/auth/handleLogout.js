import { router } from '@router';
import { auth } from '@auth/authManager.js';
import { apiRequest } from '@api/apiRequest';
import { API_ENDPOINTS } from '@api/endpoints';
import '@components/navbar/components/DropdownMenu.js';

export async function handleLogout(event) {
  event.preventDefault();
  auth.clearUser();

  try {
    const response = await apiRequest('DELETE', API_ENDPOINTS.LOGOUT, null, false, true);
    console.log('Response:', response);
    if (response.status === 200 || response.status === 204) {
      console.log('Logout successful');
    } else {
      console.error('A problem occurred while logging out:', response);
    }
  } catch (error) {
    console.error('Error:', error);
    const navbar = document.getElementById('navbar-container');
    navbar.innerHTML = '<navbar-component></navbar-component>';
    router.navigate('/');
  }
  document.cookie = `csrftoken=; Max-Age=0; path=/;`;
  const navbar = document.getElementById('navbar-container');
  navbar.innerHTML = '<navbar-component></navbar-component>';
  router.navigate('/');
}
