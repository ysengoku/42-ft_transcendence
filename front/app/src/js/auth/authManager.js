import { API_ENDPOINTS } from '@api';
import { getCSRFTokenfromCookies } from './csrfToken';
import { refreshAccessToken } from './refreshToken';
import { showAlertMessage, showAlertMessageForDuration, ALERT_TYPE, ERROR_MESSAGES } from '@utils';

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
    constructor() {
      this.websocket = null;
      // Listen for page visibility changes to reconnect the websocket if needed
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && this.getStoredUser() && !this.isWebSocketConnected()) {
          this.connectWebSocket();
        }
      });
    }

    /**
     * Set the user object in session storage and dispatch a custom event to notify
     * @param {Object} user - The user object to store in session storage
     * @return {void}
     */
    storeUser(user) {
      sessionStorage.setItem('user', JSON.stringify(user));
      const event = new CustomEvent('userStatusChange', { detail: user, bubbles: true });
      document.dispatchEvent(event);
      
      // Connect to WebSocket after successful authentication
      this.connectWebSocket();
    }

    /**
     * Clear the user object from session storage and dispatch a custom event to notify
     * @return {void}
     */
    clearStoredUser() {
      sessionStorage.removeItem('user');
      const event = new CustomEvent('userStatusChange', { detail: { user: null }, bubbles: true });
      document.dispatchEvent(event);
      
      // Disconnect WebSocket when logging out
      this.disconnectWebSocket();
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
     * Check if WebSocket is connected
     * @return {boolean} Whether the WebSocket is connected
     */
    isWebSocketConnected() {
      return this.websocket && this.websocket.readyState === WebSocket.OPEN;
    }
    
    /**
     * Connect to the WebSocket server for online status
     */
    connectWebSocket() {
      // Close any existing connection
      this.disconnectWebSocket();
      
      try {
        // Make sure we're authenticated before connecting
        const user = this.getStoredUser();
        if (!user) {
          console.log('Not connecting WebSocket: User not authenticated');
          return;
        }
        console.log('Cookies avant connexion WebSocket:', document.cookie);
    
        setTimeout(() => {
        const urlWs = `wss://${window.location.host}/ws/online/`;
        console.log('Connecting WebSocket to:', urlWs);
        
        this.websocket = new WebSocket(urlWs);
        
        this.websocket.addEventListener('open', () => {
          console.log('WebSocket connection established');
        });
        
        this.websocket.addEventListener('close', (event) => {
          console.log(`WebSocket connection closed with code ${event.code}`);
          
          // Attempt to reconnect if it was an abnormal closure and user is still logged in
          if (event.code !== 1000 && event.code !== 1001 && this.getStoredUser()) {
            console.log('Attempting to reconnect WebSocket in 5 seconds...');
            setTimeout(() => this.connectWebSocket(), 5000);
          }
          this.websocket.addEventListener('error', (error) => {
            console.error('WebSocket error:', error);
          });
        });}, 1000);
      } catch (error) {
        console.error('Error setting up WebSocket:', error);
      }
    }

    
    
    /**
     * Disconnect from the WebSocket server
     */
    disconnectWebSocket() {
      if (this.websocket) {
        console.log('Closing WebSocket connection');
        this.websocket.close();
        this.websocket = null;
      }
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
      
      try {
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
                this.clearStoredUser();
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
          this.clearStoredUser();
          return { success: false, status: response.status };
        }
        
        return { success: false, status: response.status };
      } catch (error) {
        console.error('Error fetching auth status:', error);
        showAlertMessage(ALERT_TYPE.ERROR, ERROR_MESSAGES.NETWORK_ERROR);
        return { success: false, error };
      }
    }
  }
  return new AuthManager();
})();

export { auth };