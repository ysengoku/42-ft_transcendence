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
  }
  return new AuthManager();
})();

export { auth };
