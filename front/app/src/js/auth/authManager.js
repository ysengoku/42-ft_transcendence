const auth = (() => {
  class AuthManager {
    constructor() {
      this.user = null;
      this.loadUser();
    }

    loadUser() {
      const user = sessionStorage.getItem('user');
      if (user) {
        this.user = JSON.parse(user);
      }
    }

    setUser(user) {
      this.user = user;
      sessionStorage.setItem('user', JSON.stringify(user));
    }

    clearUser() {
      this.user = null;
      sessionStorage.removeItem('user');
    }

    getUser() {
      return this.user;
    }

    isLoggedIn() {
      if (this.getUser() !== null) {
        return true;
      }
      // TODO: Add API request
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
  }
  return new AuthManager();
})();

export { auth };
