export class Router {
	constructor() {
		this.routes = new Map();
		this.currentComponent = null;
		this.init();
	}

	addRoute(path, componentTag) {
		this.routes.set(path, { componentTag, isDynamic });
	}

	handleRoute() {
		const path = window.location.pathname;
		const route = this.routes.get(path) || this.matchDynamicRoute(path);

		if (route) {
			const { componentTag, isDynamic, param } = route;

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
			return null;
		}
	}

	extractParam(routePath, path) {
		const routePathParts = routePath.split('/');
		const pathParts = path.split('/');
		if (routePathParts.length !== pathParts.length) {
			return null;
		}
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
		document.getElementById('content').innerHTML = `<${componentTag}></${componentTag}>`;
	}

	renderDynamicComponent(componentTag, param) {
		if (this.currentComponent) {
			this.currentComponent.remove();
		}
		const component = document.createElement(componentTag);
		component.param = param;

		document.getElementById('content').appendChild(component);
		this.currentComponent = component;
	}

	init() {
		window.addEventListener('popstate', () => this.navigate());
		document.addEventListener('DOMContentLoaded', () => this.navigate());

		document.addEventListener('click', (event) => {
			if (event.target && event.target.matches('a[href^="/"]')) {
				event.preventDefault();
				const path = event.target.getAttribute('href');
				this.navigate();
			}
		});
	}
}
