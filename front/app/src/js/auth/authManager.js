/**
 * @module authManager
 * Authentication manager to handle user authentication state.
 * @requires module:router
 * @requires module:api
 * @requires module:refreshToken
 */

import { router } from '@router';
import { API_ENDPOINTS } from '@api';
import { getCSRFTokenfromCookies, clearCSRFToken } from './csrfToken';
import { refreshAccessToken } from './refreshToken';
import { ERROR_MESSAGES, showErrorMessage, removeAlert } from '@utils';

const auth = (() => {
  class AuthManager {
    constructor() {
    }

    /**
     * Set the user object in session storage and dispatch a custom event to notify
     * @param {Object} user - The user object to store in session storage
     * @return {void}
     */
    setUser(user) {
      sessionStorage.setItem('user', JSON.stringify(user));
      const event = new CustomEvent('loginStatusChange', { detail: user, bubbles: true });
      document.dispatchEvent(event);
    }

    /**
     * Clear the user object from session storage and dispatch a custom event to notify
     * @return {void}
     */
    clearUser() {
      sessionStorage.removeItem('user');
      const event = new CustomEvent('loginStatusChange', { detail: { user: null }, bubbles: true });
      document.dispatchEvent(event);
    }

    /**
     * Clear the stored user data and CSRF token, then redirect to the landing page
     * @return {void}
     */
    clearSession() {
      this.clearUser();
      clearCSRFToken();
      // Show message to user to login again
      router.navigate('/');
    }

    // OK
    /**
     * Retrieve the user object from session storage
     * @return { Object | null } The user object from session storage or null
     */
    getUser() {
      const user = sessionStorage.getItem('user');
      if (!user) {
        return null;
      }
      return JSON.parse(user);
    }

    /**
     * Fetch the user authentication status from the server
     * @return {Promise<boolean>} Resolves to true if authenticated, otherwise false
     */
    async fetchAuthStatus() {
      console.log('Fetching user login status...');
      const CSRFToken = getCSRFTokenfromCookies();
      // if (!CSRFToken) {
      //   console.log('User is not logged in: No CSRF token');
      //   return false;
      // }
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
        this.setUser(data);
        return { success: true, response: data };
      } else if (response.status === 401) {
        const refreshTokenResponse = await refreshAccessToken(CSRFToken);
        console.log('<fetchAuthStatus> Refresh token response:', refreshTokenResponse);
        switch (refreshTokenResponse.status) {
          case 204:
            console.log('<fetchAuthStatus> 204 - Token refreshed, user is logged in');
            return this.fetchAuthStatus();
            // return { success: true, status: refreshTokenResponse.status };
          case 401:
            console.log('<fetchAuthStatus> 401 - Token expired, user is not logged in.');
            this.clearUser();
            clearCSRFToken();
            return { success: false, status: refreshTokenResponse.status };
          case 500:
            showErrorMessage(ERROR_MESSAGES.SERVER_ERROR);
            setTimeout(() => {
              removeAlert();
            }, 3000);
            // Server error handling
            break;
          default:
            console.log('<fetchAuthStatus> Unknown error.');
            showErrorMessage(ERROR_MESSAGES.SOMETHING_WENT_WRONG);
            this.clearUser();
            clearCSRFToken();
            return { success: false, status: refreshTokenResponse.status };
        }
      }
    }
  }
  return new AuthManager();
})();

export { auth };
