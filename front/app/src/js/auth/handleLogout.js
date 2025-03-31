import { router } from '@router';
import { auth } from '@auth';
import { apiRequest, API_ENDPOINTS } from '@api';

export async function handleLogout() {
  const response = await apiRequest('DELETE', API_ENDPOINTS.LOGOUT, null, false, true);
  if (response.success) {
    devLog('Logout successful');
  } else {
    devErrorLog('A problem occurred while logging out:', response);
  }
  auth.clearStoredUser();
  router.navigate('/');
}
