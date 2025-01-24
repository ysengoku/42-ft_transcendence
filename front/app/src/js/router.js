const router = (() => {
    class Router {
        constructor() {
            this.routes = new Map();
            this.currentComponent = null;
        }

        addRoute(path, componentTag, isDynamic = false, requiresAuth = false) {
            this.routes.set(path, { componentTag, isDynamic, requiresAuth });
        }

        handleRoute() {
            const path = window.location.pathname;
            const route = this.routes.get(path) || this.matchDynamicRoute(path);

            if (route) {
                const { componentTag, isDynamic, param, requiresAuth } = route;

                if (requiresAuth && !this.isLoggedIn()) {
                    this.navigate('/login');
                    return;				
                }
                if (isDynamic) {
                    // console.log('param: ', param);
                    this.renderDynamicComponent(componentTag, param);
                } else {
                    this.renderComponent(componentTag);
                }
            } else { console.error(`Route not found for path: ${path}`);
                this.renderComponent('not-found');
            }
        }

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

        isLoggedIn() {
            return localStorage.getItem('isLoggedIn') === 'true';  // This is temoporay simulation
        }

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

        renderComponent(componentTag) {
            if (this.currentComponent) {
                this.currentComponent.remove();
            }
            const component = document.createElement(componentTag);
            const contentElement = document.getElementById('content');
            contentElement.innerHTML = '';
            contentElement.appendChild(component);
            this.currentComponent = component;
        }

        renderDynamicComponent(componentTag, param) {
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

        navigate(path = window.location.pathname) {
            console.log('Navigating to:', path);
            window.history.pushState({}, '', path);
            this.handleRoute();
        }

        init() {
            window.addEventListener('popstate', () => this.handleRoute());
            document.addEventListener('click', (event) => this.handleLinkClick(event));
        }

        handleLinkClick(event) {
            if (event.target && event.target.matches('a[href^="/"]')) {
                event.preventDefault();
                const path = event.target.getAttribute('href');
                this.navigate(path);
            }
        }
    }

    return new Router()
})();

router.addRoute("/", "landing-component");
router.addRoute("/login", "login-form");
router.addRoute("/register", "register-form");
router.addRoute("/home", "user-home", false, true);
router.addRoute("/profile/:username", "user-profile", true, true);
router.addRoute("/settings/:username", "user-settings", true, true);
router.addRoute("/dual-menu", "dual-menu", false, true);
router.addRoute("/dual/:id", "dual", true, true);
router.addRoute("/tournament-menu", "tournament-menu", false, true);
router.addRoute("/tournament/:id", "tournament", true, true);
router.addRoute("/chat", "chat-page", false, true);
// Add all routes here

document.addEventListener("DOMContentLoaded", () => {
  const navbarContainer = document.getElementById("navbar-container");
  if (navbarContainer) {
    navbarContainer.innerHTML = "<navbar-component></navbar-component>";
  } else {
    console.log("Error");
  }
  router.init();
  const currentPath = window.location.pathname || "/";
  router.navigate(currentPath);
});

export { router };
