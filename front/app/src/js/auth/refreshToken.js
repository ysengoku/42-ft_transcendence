import { auth } from '@auth';
import { API_ENDPOINTS } from '@api';
import { showAlertMessage, ALERT_TYPE, ERROR_MESSAGES } from '@utils';

/**
 * Refreshes the access token using the provided CSRF token.
 *
 * @async
 * @function
 * @param {string} csrfToken - The CSRF token to be used for the refresh request.
 * @return {Promise<Object>} An object containing the success status and response status.
 */
export async function refreshAccessToken(csrfToken) {
  /**
   * Retries the refresh token request in case of a server error.
   *
   * @async
   * @function
   * @param {Object} request - The request object for the fetch call.
   * @param {number} delay - The delay (in milliseconds) before retrying the request.
   * @param {number} maxRetries - The maximum number of retry attempts.
   * @return {Promise<Object>} An object containing the success status and response status.
   */
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
      showAlertMessage(ALERT_TYPE.ERROR, ERROR_MESSAGES.UNKNOWN_ERROR);
      return { success: false, status: 500 };
    }, delay);
  }

  devLog('Refreshing access token');
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
        devLog('Refresh successful');
        return { success: true, status: 204 };
      } else if (refreshResponse.status === 500) {
        showAlertMessage(ALERT_TYPE.ERROR, ERROR_MESSAGES.SERVER_ERROR);
        devErrorLog('Server error, retrying refresh token request');
        return retryRefreshTokenRequest(request, 3000, 2);
      }
      devErrorLog('Refresh failed');
      auth.clearStoredUser();
      return { success: false, status: refreshResponse.status };
    } catch (error) {
      devErrorLog(error);
      auth.clearStoredUser();
      return { success: false, status: 0 };
    }
  }
  auth.clearStoredUser();
  return { success: false, status: 401 };
}
