import { router } from '@router';
import { API_ENDPOINTS } from '@api';
import { refreshAccessToken } from './refreshToken';

const auth = (() => {
  class AuthManager {
    constructor() {
    }

    setUser(user) {
      sessionStorage.setItem('user', JSON.stringify(user));
      const event = new CustomEvent('loginStatusChange', { detail: user, bubbles: true });
      document.dispatchEvent(event);
    }

    clearUser() {
      sessionStorage.removeItem('user');
      const event = new CustomEvent('loginStatusChange', { detail: {user: null}, bubbles: true });
      document.dispatchEvent(event);
    }

    // OK
    getUser() {
      const user = sessionStorage.getItem('user');
      return JSON.parse(user);
    }

    // Use only for rendering purposes
    isLoggedIn() {
      if (this.getUser() !== null) {
        return true;
      }
      return this.fetchAuthStatus();
    }

    async fetchAuthStatus() {
      const cSRFToken = this.getCSRFTokenfromCookies();
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
   
    getCSRFTokenfromCookies() {
      const name = 'csrftoken';
      let token = null;
      if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
          const cookie = cookies[i].trim();
          if (cookie.startsWith(name)) {
            token = decodeURIComponent(cookie.substring(name.length + 1));
            break;
          }
        }
      }
      return token;
    }

    clearSession() {
      this.clearUser();
      document.cookie = `csrftoken=; Max-Age=0; path=/;`;
      router.navigate('/');
    }
  }
  return new AuthManager();
})();

export { auth };
