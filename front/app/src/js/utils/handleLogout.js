import { router } from '@router';
import { apiRequest } from '@api/apiRequest';
import { API_ENDPOINTS } from '@api/endpoints';
import '@components/navbar/components/DropdownMenu.js';

export async function handleLogout(event) {
  event.preventDefault();
  localStorage.removeItem('isLoggedIn'); // Need to delete later
  localStorage.removeItem('user');
  
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
    const navbar = document.querySelector('navbar-component');
    navbar.setLoginStatus(false);
    router.navigate('/');
  }
  document.cookie = `csrftoken=; Max-Age=0; path=/;`;
  // const navBar = document.getElementById('navbar-container');
  // navBar.innerHTML = '<navbar-component></navbar-component>';
  const navbar = document.querySelector('navbar-component');
  navbar.setLoginStatus(false);
  router.navigate('/');
}
