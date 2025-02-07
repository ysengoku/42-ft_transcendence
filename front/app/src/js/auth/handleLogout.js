import { router } from '@router';
import { auth } from '@auth/authManager.js';
import { autoLogout } from '@auth/autoLogout.js';
import { API_ENDPOINTS } from '@api/endpoints';
import '@components/navbar/components/DropdownMenu.js';

export async function handleLogout(event) {
  event.preventDefault();
  auth.clearUser();

  try {
    const response = await fetch(API_ENDPOINTS.LOGOUT, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': auth.getCSRFTokenfromCookies(),
      },
      credentials: 'include',
    });

    if (response.ok) {
      console.log('Logout successful');
    } else if (response.status === 401) {
      console.log('Session expired. Auto logout');
      autoLogout();
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
