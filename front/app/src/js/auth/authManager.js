import { API_ENDPOINTS } from '@api';
import { getCSRFTokenfromCookies } from './csrfToken';
import { refreshAccessToken } from './refreshToken';
import { showAlertMessage, showAlertMessageForDuration, ALERT_TYPE, ERROR_MESSAGES } from '@utils';
import { socketManager } from '@socket';

/**
 * @module authManager
 * Authentication manager to handle user authentication state.
 * @requires module:api
 * @requires module:csrfToken
 * @requires module:refreshToken
 * @requires module:utils
 */
const auth = (() => {
  class AuthManager {
    /**
     * Set the user object in session storage and dispatch a custom event to notify
     * @param {Object} user - The user object to store in session storage
     * @return {void}
     */
    storeUser(user) {
      sessionStorage.setItem('user', JSON.stringify(user));
      const event = new CustomEvent('userStatusChange', { detail: user, bubbles: true });
      document.dispatchEvent(event);
      socketManager.connect();
    }

    updateStoredUser(user) {
      sessionStorage.setItem('user', JSON.stringify(user));
      const event = new CustomEvent('userStatusChange', { detail: user, bubbles: true });
      document.dispatchEvent(event);
    }

    /**
     * Clear the user object from session storage and dispatch a custom event to notify
     * @return {void}
     */
    clearStoredUser() {
      sessionStorage.removeItem('user');
      const event = new CustomEvent('userStatusChange', { detail: { user: null }, bubbles: true });
      document.dispatchEvent(event);
      socketManager.close();
    }

    /**
     * Retrieve the user object from session storage
     * @return { Object | null } The user object from session storage or null
     */
    getStoredUser() {
      const user = sessionStorage.getItem('user');
      if (!user) {
        return null;
      }
      return JSON.parse(user);
    }

    /**
     * Fetch the user authentication status from the server
     * @return { Promise<Object> } Object including success: bool & user data on success or status code on failure
     */
    async fetchAuthStatus() {
      console.log('Fetching user login status...');
      const CSRFToken = getCSRFTokenfromCookies();
      const request = {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': CSRFToken,
        },
        credentials: 'include',
      };
      const response = await fetch(API_ENDPOINTS.SELF, request);
      if (response.ok) {
        const data = await response.json();
        console.log('User is logged in: ', data);
        this.storeUser(data);
        return { success: true, response: data };
      } else if (response.status === 401) {
        const refreshTokenResponse = await refreshAccessToken(CSRFToken);
        if (refreshTokenResponse.status) {
          switch (refreshTokenResponse.status) {
            case 204:
              return this.fetchAuthStatus();
            case 401:
              return { success: false, status: 401 };
            case 500:
              showAlertMessageForDuration(ALERT_TYPE.ERROR, ERROR_MESSAGES.SERVER_ERROR, 3000);
              break;
            default:
              console.log('Unknown error.');
              showAlertMessage(ALERT_TYPE.ERROR, ERROR_MESSAGES.UNKNOWN_ERROR);
              return { success: false, status: refreshTokenResponse.status };
          }
        }
        return { success: false, status: response.status };
      }
      return { success: false, status: response.status };
    }
  }
  return new AuthManager();
})();

export { auth };
