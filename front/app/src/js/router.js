import { auth } from '@auth';
import { addDissmissAlertListener } from '@utils';
// import { CubeTexture } from 'three/src/Three.Core.js';

/**
 * Router module for handling client-side navigation.
 * @module router
 * @requires module:landing-page
 * @requires module:login-page
 * @requires module:register-form
 * @requires module:user-home
 * @requires module:user-profile
 * @requires module:user-not-found
 * @requires module:user-settings
 * @requires module:duel-menu
 * @requires module:duel
 * @requires module:duel-result
 * @requires module:tournament-menu
 * @requires module:tournament
 * @requires module:chat-page
 */
const router = (() => {
  class Router {
    constructor() {
      this.routes = new Map();
      this.currentComponent = null;
    }

    /** Add a new route to the router.
     * @param {string} path - The URL path for the route.
     * @param {string} componentTag - The custom HTML tag for the component to render.
     * @param {boolean} [isDynamic=false] - Whether the route is dynamic (contains a parameter).
     * @return {void}
     * @example
     * router.addRoute('/home', 'user-home', false, true);
     */
    addRoute(path, componentTag, isDynamic = false) {
      this.routes.set(path, { componentTag, isDynamic });
    }

    /**
     * Handles route changes and renders the appropriate component.
     * @param {string} [queryParams=''] - The query parameters included in the URL.
     * @return {void}
     */
    handleRoute(queryParams = '') {
      const path = window.location.pathname;
      const route = this.routes.get(path) || this.matchDynamicRoute(path);

      if (route) {
        const { componentTag, isDynamic, param } = route;
        if (isDynamic) {
          // console.log('param: ', param);
          this.renderDynamicUrlComponent(componentTag, param);
        } else {
          this.renderStaticUrlComponent(componentTag, queryParams);
        }
      } else {
        console.error(`Route not found for: ${path}`);
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
      console.log('param: ', param);
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
        for (const [key, value] of queryParams.entries()) {
          console.log(`${key}: ${value}`);
        }
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
    renderDynamicUrlComponent(componentTag, param) {
      if (this.currentComponent) {
        this.currentComponent.remove();
      }
      const component = document.createElement(componentTag);
      if (typeof component.setParam === 'function') {
        component.setParam(param);
      }
      document.getElementById('content').appendChild(component);
      this.currentComponent = component;
    }

    /**
     * Navigates to the specified path.
     * @param {string} [path=window.location.pathname] - The path to navigate to.
     * @param {string} [queryParams=''] - The query parameters to include in the URL.
     * @return {void}
     */
    navigate(path = window.location.pathname, queryParams = '') {
      console.log('Navigating to:', path);
      if (path === '/user-not-found') {
        window.history.replaceState({}, '', path);
      } else {
        window.history.pushState({}, '', path);
      }
      this.handleRoute(queryParams);
    }

    /**
     * Initializes the router by setting up event listeners for clicks and popstate.
     * @return {void}
     */
    init() {
      window.addEventListener('popstate', () => this.handleRoute());
      document.addEventListener('click', (event) => this.handleLinkClick(event));
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
  }
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
// router.addRoute('/duel/:id', 'duel', true);
router.addRoute('/duel-result', 'duel-result', true);
router.addRoute('/tournament-menu', 'tournament-menu');
// router.addRoute('/tournament/:id', 'tournament', true);
router.addRoute('/game', 'app-game');
router.addRoute('/error', 'error-page');

/**
 * Initialize the router on the initial HTML document load
 */
document.addEventListener('DOMContentLoaded', async () => {
  console.log('DOM loaded');
  await auth.fetchAuthStatus();
  const navbarContainer = document.getElementById('navbar-container');
  if (navbarContainer) {
    navbarContainer.innerHTML = '<navbar-component></navbar-component>';
  } else {
    console.error('Error rendering navbar');
  }
  router.init();
  addDissmissAlertListener();
  const currentPath = window.location.pathname || '/';
  const queryParams = new URLSearchParams(window.location.search);
  router.navigate(currentPath, queryParams);
});

export { router };
