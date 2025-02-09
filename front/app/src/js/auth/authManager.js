/**
 * @module authManager
 * Authentication manager to handle user authentication state.
 * @requires module:router
 * @requires module:api
 * @requires module:refreshToken
 */

import { router } from '@router';
import { API_ENDPOINTS } from '@api';
import { getCSRFTokenfromCookies } from './csrfToken';
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
      document.cookie = `csrftoken=; Max-Age=0; path=/;`;
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
      const cSRFToken = getCSRFTokenfromCookies();
      if (!cSRFToken) {
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
      console.log('Sending API request:', request);
      const response = await fetch(API_ENDPOINTS.SELF, request);
      console.log('Auth status response:', response);
      if (response.ok) {
        const data = await response.json();
        console.log('User is logged in: ', data);
        this.setUser(data);
        return true;
      } else if (response.status === 401) {
        const refreshToken = await refreshAccessToken(cSRFToken);
        if (refreshToken) {
          return true;
        } else {
          console.log('User is not logged in');
          this.clearUser();
          return false;
        }
      }
      return false;
    }

    /**
     * Retrieve the CSRF token from the cookies
     * @return {string | null}
     */
    // getCSRFTokenfromCookies() {
    //   const name = 'csrftoken';
    //   let token = null;
    //   if (document.cookie && document.cookie !== '') {
    //     const cookies = document.cookie.split(';');
    //     for (let i = 0; i < cookies.length; i++) {
    //       const cookie = cookies[i].trim();
    //       if (cookie.startsWith(name)) {
    //         token = decodeURIComponent(cookie.substring(name.length + 1));
    //         break;
    //       }
    //     }
    //   }
    //   return token;
    // }
  }
  return new AuthManager();
})();

export { auth };
