import { auth } from '@auth';
import { API_ENDPOINTS } from '@api';
import { internalServerErrorAlert, unknownErrorToast } from '@utils';

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
    while (retries < maxRetries) {
      await new Promise((resolve) => setTimeout(resolve, delay * retries));
      const response = await fetch(API_ENDPOINTS.REFRESH, request);
      if (response.ok) {
        log.info('Refresh successful on retry');
        return { success: true, status: 204 };
      } else if (response.status === 500) {
        ++retries;
        log.error(`Refresh failed on retry with status ${response.status}. Retrying...`);
      } else {
        unknownErrorToast();
        log.error(`Refresh failed with status ${response.status}`);
        return { success: false, status: response.status };
      }
    }
    unknownErrorToast();
    log.error(`Refresh failed with status ${response.status}`);
    return { success: false, status: response.status };
  }

  log.trace('Refreshing access token...');
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
      switch (refreshResponse.status) {
        case 204:
          log.info('Refresh successful');
          return { success: true, status: 204 };
        case 500:
          internalServerErrorAlert();
          log.error('Server error, retrying refresh token request');
          return await retryRefreshTokenRequest(request, 2000, 2);
        default:
          log.info('Refresh failed');
          auth.clearStoredUser();
          return { success: false, status: refreshResponse.status };
      }
    } catch (error) {
      log.error(error);
      auth.clearStoredUser();
      return { success: false, status: 0 };
    }
  }
  auth.clearStoredUser();
  return { success: false, status: 401 };
}
