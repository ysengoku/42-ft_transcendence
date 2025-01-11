export class Router {
	constructor() {
		this.routes = new Map();
		this.currentComponent = null;
	}

	addRoute(path, componentTag, isDynamic = false) {
        this.routes.set(path, { componentTag, isDynamic });
	}

	handleRoute(param) {
		const path = window.location.pathname;
		const route = this.routes.get(path) || this.matchDynamicRoute(path);

		if (route) {
			const { componentTag, isDynamic } = route;

			if (isDynamic) {
				this.renderDynamicComponent(componentTag, param);
			} else {
				this.renderComponent(componentTag);
			}
		} else {
			console.error(`Route not found for path: ${path}`);
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

	navigate(path = window.location.pathname, param = null) {
		console.log('Navigating to:', path);
		window.history.pushState({}, '', path);
		this.handleRoute(param);
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
