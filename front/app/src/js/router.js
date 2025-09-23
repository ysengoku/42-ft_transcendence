import { addDismissAlertListener } from '@utils';

/**
 * Router module for handling client-side navigation.
 * @module router
 */
const router = (() => {
  class Router {
    constructor() {
      this.routes = new Map();
      this.pathToReplace = new Set(['/reset-password', '/mfa-verification', '/user-not-found', '/error']);
      this.isFirstLoad = true;
      this.currentComponent = null;
      this.beforeunloadCallback = null;
    }

    /** Add a new route to the router.
     * @param {string} path - The URL path for the route.
     * @param {string} componentTag - The custom HTML tag for the component to render.
     * @param {boolean} [isDynamic=false] - Whether the route is dynamic (contains a parameter).
     * @return {void}
     * @example
     * router.addRoute('/home', 'user-home', false);
     */
    addRoute(path, componentTag, isDynamic = false) {
      this.routes.set(path, { componentTag, isDynamic });
    }

    /**
     * Initializes the router by setting up event listeners for clicks and popstate.
     * @return {void}
     */
    init() {
      window.addEventListener('popstate', this.handlePopstate.bind(this));
      document.addEventListener('click', (event) => this.handleLinkClick(event));
    }

    /**
     * Set a callback function to be called before the page unloads.
     * @param {function} callback - The callback function to set.
     * @return {void}
     */
    setBeforeunloadCallback(callback) {
      this.beforeunloadCallback = callback;
    }

    /**
     * Remove the beforeunload callback function.
     * @return {void}
     */
    removeBeforeunloadCallback() {
      this.beforeunloadCallback = null;
    }

    /**
     * Handles route changes and renders the appropriate component.
     * @param {string} [queryParams=''] - The query parameters included in the URL.
     * @return {void}
     */
    handleRoute(queryParams = new URLSearchParams()) {
      const path = window.location.pathname;
      const route = this.routes.get(path) || this.matchDynamicRoute(path);

      if (route) {
        const { componentTag, isDynamic, param } = route;
        if (isDynamic) {
          this.renderDynamicUrlComponent(componentTag, param, queryParams);
        } else {
          this.renderStaticUrlComponent(componentTag, queryParams);
        }
      } else {
        log.error('Route not found:', path);
        this.renderStaticUrlComponent('page-not-found');
      }
    }

    /**
     * Matches dynamic routes by extracting parameters.
     * @param {string} path - The current URL path.
     * @return {Object|null} The matched route data or null if no match found.
     */
    matchDynamicRoute(path) {
      for (const [routePath, routeData] of this.routes.entries()) {
        if (routeData.isDynamic) {
          const param = this.extractParam(routePath, path);
          if (param) {
            return { ...routeData, param };
          }
        }
      }
      return null;
    }

    /**
     * Extracts parameters from a dynamic route.
     * @param {string} routePath - The defined route path.
     * @param {string} path - The current URL path.
     * @return {Object|null} The extracted parameters or null if no match.
     */
    extractParam(routePath, path) {
      const routePathParts = routePath.split('/');
      const pathParts = path.split('/');
      if (routePathParts.length !== pathParts.length) {
        return null;
      }
      const param = {};
      for (let i = 0; i < routePathParts.length; i++) {
        if (routePathParts[i].startsWith(':')) {
          param[routePathParts[i].slice(1)] = pathParts[i];
        } else if (routePathParts[i] !== pathParts[i]) {
          return null;
        }
      }
      return param;
    }

    /**
     * Renders a static URL component.
     * @param {string} componentTag - The custom HTML tag for the component to render.
     * @param {Object} [queryParams=''] - The query parameters included in the URL.
     * @return {void}
     */
    renderStaticUrlComponent(componentTag, queryParams = '') {
      if (this.currentComponent) {
        this.currentComponent.remove();
      }
      const component = document.createElement(componentTag);

      if (queryParams.size > 0) {
        component.setQueryParam(queryParams);
      }
      const contentElement = document.getElementById('content');
      contentElement.innerHTML = '';
      contentElement.appendChild(component);
      this.currentComponent = component;
    }

    /**
     * Renders a dynamic URL component with parameters.
     * @param {string} componentTag - The custom HTML tag for the component to render.
     * @param {Object} param - The parameters extracted from the URL.
     * @return {void}
     */
    renderDynamicUrlComponent(componentTag, param, queryParams = '') {
      if (this.currentComponent) {
        this.currentComponent.remove();
      }
      const component = document.createElement(componentTag);
      if (typeof component.setParam === 'function') {
        component.setParam(param);
      }
      if (queryParams.size > 0 && typeof component.setQueryParam === 'function') {
        component.setQueryParam(queryParams);
      }
      document.getElementById('content').appendChild(component);
      this.currentComponent = component;
    }

    /**
     * Navigates to the specified path.
     * @param {string} [path=window.location.pathname] - The path to navigate to.
     * @param {string} [queryParams=''] - The query parameters to include in the URL.
     * @param {boolean} [redirect=false] - Whether to replace the current history entry or push a new one.
     * @return {void}
     */
    async navigate(path = window.location.pathname, queryParams = '', redirect = false) {
      log.info('Navigating to:', path);
      const splitPath = path.split('?');
      if (splitPath[1]) {
        path = splitPath[0];
        queryParams = splitPath[1];
      }
      if (this.beforeunloadCallback) {
        const response = await this.beforeunloadCallback();
        if (!response) {
          return;
        }
      }
      this.beforeunloadCallback = null;

      let queryParamsObject = new URLSearchParams();
      if (queryParams) {
        switch (typeof queryParams) {
          case 'string':
            if (queryParams.length <= 0) {
              break;
            }
          case 'object':
            queryParamsObject = new URLSearchParams(queryParams);
            break;
          default:
            queryParamsObject = queryParams;
        }
      }

      const shouldReplace = redirect || this.isFirstLoad || this.pathToReplace.has(path);
      const historyUpdateMethod = shouldReplace ? 'replaceState' : 'pushState';
      const queryParamsString = queryParamsObject.toString();
      const fullPath = queryParamsString ? `${path}?${queryParamsString}` : path;
      window.history[historyUpdateMethod]({}, '', fullPath);
      this.isFirstLoad = false;
      this.handleRoute(queryParamsObject);
    }

    /**
     * Redirects to a new path. The old path is replaced by the redirection destination in the history stack.
     * @param {string} [path=window.location.pathname] - The path to navigate to.
     * @param {string} [queryParams=''] - The query parameters to include in the URL.
     * @return {void}
     */
    async redirect(path = window.location.pathname, queryParams = '') {
      log.trace('Redirecting');
      this.navigate(path, queryParams, true);
    }

    /**
     * Handles navigation for internal links.
     * @param {Event} event - The click event.
     * @return {void}
     */
    handleLinkClick(event) {
      if (event.target && event.target.matches('a[href^="/"]')) {
        event.preventDefault();
        const path = event.target.getAttribute('href');
        this.navigate(path);
      }
    }

    /**
     * Handles the popstate event when the user navigates back or forward.
     * @return {void}
     * */
    async handlePopstate() {
      if (this.beforeunloadCallback) {
        const response = await this.beforeunloadCallback();
        if (!response) {
          return;
        }
        this.beforeunloadCallback = null;
      }
      const queryParams = new URLSearchParams(window.location.search);
      this.handleRoute(queryParams);
    }
  }

  /**
   * Initialize the router instance.
   * @return {Router} The router instance.
   */
  return new Router();
})();

/**
 * Define all routes
 */
router.addRoute('/', 'landing-page');
router.addRoute('/register', 'register-form');
router.addRoute('/login', 'login-page');
router.addRoute('/mfa-verification', 'mfa-verification');
router.addRoute('/forgot-password', 'forgot-password');
router.addRoute('/reset-password/:token', 'reset-password', true);
router.addRoute('/home', 'user-home');
router.addRoute('/profile/:username', 'user-profile', true);
router.addRoute('/user-not-found', 'user-not-found');
router.addRoute('/settings', 'user-settings');
router.addRoute('/account-deleted', 'account-deleted');
router.addRoute('/chat', 'chat-page');
router.addRoute('/duel-menu', 'duel-menu');
router.addRoute('/duel', 'duel-page');
router.addRoute('/local-game-menu', 'local-game-menu');
router.addRoute('/tournament-menu', 'tournament-menu');
router.addRoute('/tournament/:id', 'tournament-room', true);
router.addRoute('/tournament-overview/:id', 'tournament-overview', true);
router.addRoute('/multiplayer-game/:id', 'multiplayer-game', true);
router.addRoute('/singleplayer-game', 'singleplayer-game');
router.addRoute('/error', 'error-page');

/**
 * Initialize the router on the initial HTML document load
 */
document.addEventListener('DOMContentLoaded', async () => {
  router.init();
  addDismissAlertListener();
  const currentPath = window.location.pathname || '/';
  const queryParams = new URLSearchParams(window.location.search);

  await new Promise((resolve) => setTimeout(resolve, 50));
  router.navigate(currentPath, queryParams);
});

export { router };

export const __test__ = {
  extractParam: router.extractParam.bind(router),
  matchDynamicRoute: router.matchDynamicRoute.bind(router),
  navigate: router.navigate.bind(router),
  router,
};
