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
      console.log('Checking user login status...');
      const cSRFToken = getCSRFTokenfromCookies();
      if (!cSRFToken) {
        console.log('User is not logged in: No CSRF token');
        return false;
      }
      const request = {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': cSRFToken,
        },
        credentials: 'include',
      };
      const response = await fetch(API_ENDPOINTS.SELF, request);
      if (response.ok) {
        const data = await response.json();
        console.log('User is logged in: ', data);
        this.setUser(data);
        return true;
      } else if (response.status === 401) {
        const refreshToken = await refreshAccessToken(cSRFToken);
        if (refreshToken.success) {
          return true;
        } else {
          console.log('User is not logged in: ', response);
          this.clearUser();
          clearCSRFToken();
          return false;
        }
      }
      return false;
    }
  }
  return new AuthManager();
})();

export { auth };
