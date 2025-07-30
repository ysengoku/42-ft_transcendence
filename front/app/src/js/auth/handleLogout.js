import { router } from '@router';
import { auth } from '@auth';
import { apiRequest, API_ENDPOINTS } from '@api';

export async function handleLogout() {
  const response = await apiRequest('DELETE', API_ENDPOINTS.LOGOUT, null, false, true);
  if (response.success) {
    log.info('Logout successful');
  } else {
    log.error('A problem occurred while logging out:', response);
  }
  auth.clearStoredUser();
  router.redirect('/');
}
