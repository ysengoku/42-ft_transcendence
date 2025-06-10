import { API_ENDPOINTS } from '@api';
import { getCSRFTokenfromCookies } from './csrfToken';
import { refreshAccessToken } from './refreshToken';
import { socketManager } from '@socket';
import {
  internalServerErrorAlert,
  sessionExpiredToast,
  unknowknErrorToast,
  showAlertMessageForDuration,
  ALERT_TYPE,
} from '@utils';

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
      const currentUser = this.getStoredUser();
      if (
        !currentUser ||
        currentUser.username !== user.username ||
        currentUser.unread_messages_count !== user.unread_messages_count ||
        currentUser.unread_notifications_count !== user.unread_notifications_count
      ) {
        sessionStorage.setItem('user', JSON.stringify(user));
        const event = new CustomEvent('userStatusChange', { detail: user, bubbles: true });
        document.dispatchEvent(event);
      }
      socketManager.openSocket('livechat');
    }

    updateStoredUser(user) {
      const currentUser = this.getStoredUser();
      const updatedUser = {
        username: user.username,
        nickname: user.nickname,
        avatar: user.avatar,
        unread_messages_count: currentUser.unread_messages_count,
        unread_notifications_count: currentUser.unread_notifications_count,
      };
      sessionStorage.setItem('user', JSON.stringify(updatedUser));
      const event = new CustomEvent('userStatusChange', { detail: user, bubbles: true });
      document.dispatchEvent(event);
    }

    /**
     * Clear the user object from session storage and dispatch a custom event to notify
     * @return {void}
     */
    clearStoredUser() {
      sessionStorage.removeItem('user');
      localStorage.removeItem('gameOptions');
      localStorage.removeItem('gameType');
      const event = new CustomEvent('userStatusChange', { detail: { user: null }, bubbles: true });
      document.dispatchEvent(event);
      socketManager.closeAllSockets();
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
     * Get the user stored in session storage. If not found, fetch the user from the server
     * and store it in session storage. If the user is not logged in, return null.
     * @return { Promise<Object> } The user object
     * */
    async getUser() {
      let user = sessionStorage.getItem('user');
      if (!user) {
        const response = await this.fetchAuthStatus();
        if (response.success) {
          user = response.response;
          this.storeUser(user);
        } else if (response.status === 401) {
          sessionExpiredToast();
          return null;
        }
      }
      return JSON.parse(user);
    }

    /**
     * Fetch the user authentication status from the server
     * @return { Promise<Object> } Object including success: bool & user data on success or status code on failure
     */
    async fetchAuthStatus() {
      devLog('Fetching user login status...');
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
        devLog('User is logged in: ', data);
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
              internalServerErrorAlert();
              break;
            default:
              unknowknErrorToast();
              return { success: false, status: refreshTokenResponse.status };
          }
        }
        return { success: false, status: response.status };
      }
      return { success: false, status: response.status };
    }

    /**
     * Check if the user is authenticated and has no ongoing games or tournaments.
     * @return { Promise<boolean> } Return true if the user is authenticated and have no ongoing games or tournaments.
     * If the user is not authenticated, redirects to the login page.
     * If the user has an ongoing game or tournament, shows an alert message and returns false.
     */
    async canEngageInGame(showAlert = true) {
      const authStatus = await this.fetchAuthStatus();
      if (!authStatus.success) {
        if (authStatus.status === 401) {
          sessionExpiredToast();
        }
        router.redirect('/login');
        return false;
      }
      if (
        !authStatus.response.game_id &&
        !authStatus.response.tournament_id &&
        !authStatus.response.is_engaged_in_game
      ) {
        return true;
      }
      if (showAlert) {
        let type;
        if (authStatus.response.game_id) {
          type = 'an ongoing game';
        } else if (authStatus.response.tournament_id) {
          type = 'an ongoing tournament';
        } else {
          type = 'a pending invitation or matchmaking';
        }
        showAlertMessageForDuration(ALERT_TYPE.ERROR, `You have ${type}. Cannot start new activity.`);
      }
      return false;
    }
  }
  return new AuthManager();
})();

export { auth };
