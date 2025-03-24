import { router } from '@router';
import { auth } from '@auth';
import { apiRequest, API_ENDPOINTS } from '@api';
import { socketManager } from '@socket';

export async function handleLogout() {
  const response = await apiRequest('DELETE', API_ENDPOINTS.LOGOUT, null, false, true);
  if (response.success) {
    console.log('Logout successful');
  } else {
    console.error('A problem occurred while logging out:', response);
  }
  auth.clearStoredUser();
  router.navigate('/');
}
