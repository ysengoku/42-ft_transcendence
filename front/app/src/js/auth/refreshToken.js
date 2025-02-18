import { auth } from '@auth';
import { API_ENDPOINTS } from '@api';
import { showAlertMessage, ALERT_TYPE, ALERT_MESSAGES } from '@utils';

export async function refreshAccessToken(csrfToken) {
  async function retryRefreshTokenRequest(request, delay, maxRetries) {
    let retries = 0;
    setTimeout(async () => {
      if (retries < maxRetries) {
        const response = await fetch(API_ENDPOINTS.REFRESH, request);
        if (response.ok) {
          return { success: true, status: 204 };
        } else if (response.status === 500) {
          ++retries;
        } else {
          return { success: false, status: response.status };
        }
      }
      console.error('Refresh failed');
      showAlertMessage(ALERT_TYPE.ERROR, ALERT_MESSAGES.UNKNOWN_ERROR);
      return { success: false, status: 500 };
    }, delay);
  }

  console.log('Refreshing access token');
  if (csrfToken) {
    try {
      const request = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken,
        },
        credentials: 'include',
      };
      const refreshResponse = await fetch(API_ENDPOINTS.REFRESH, request);
      if (refreshResponse.ok) {
        console.log('Refresh successful');
        return { success: true, status: 204 };
      } else if (refreshResponse.status === 500) {
        showAlertMessage(ALERT_TYPE.ERROR, ALERT_MESSAGES.SERVER_ERROR);
        console.log('Server error, retrying refresh token request');
        return retryRefreshTokenRequest(request, 3000, 2);
      }
      console.log('Refresh failed');
      auth.clearStoredUser();
      return { success: false, status: refreshResponse.status };
    } catch (error) {
      console.error(error);
      auth.clearStoredUser();
      return { success: false, status: 0 };
    }
  }
  auth.clearStoredUser();
  return { success: false, status: 401 };
}
