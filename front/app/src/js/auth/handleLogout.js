import { router } from '@router';
import { auth, getCSRFTokenfromCookies } from '@auth';
import { API_ENDPOINTS } from '@api';
import '@components/navbar/components/DropdownMenu.js';

export async function handleLogout() {
  try {
    const response = await fetch(API_ENDPOINTS.LOGOUT, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': getCSRFTokenfromCookies(),
      },
      credentials: 'include',
    });
    if (response.ok) {
      console.log('Logout successful');
    } else if (response.status === 401) {
      console.log('Session expired. Auto logout');
    } else {
      console.error('A problem occurred while logging out:', response);
    }
  } catch (error) {
    console.error('Error:', error);
    auth.clearStoredUser();
    router.navigate('/');
  }
  auth.clearStoredUser();
  router.navigate('/');
}
