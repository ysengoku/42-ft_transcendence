# Router class

`Router` class is a simple front-end router that handles navigation in a single-page application (SPA), defining routes (URLs) and associating them with specific components (custom HTML tags), dynamically rendering content based on the current URL.

## Key Features

### Routes Management (addRoute):
Routes can be registered by specifying a URL path and the component to render for that path.
Supports both static routes (e.g., `/home`) and dynamic routes (e.g., `/user/:id`).   

### Dynamic Route Matching (matchDynamicRoute and extractParam):
Dynamic routes include placeholders like `:id` that match parts of the URL dynamically.
Extracts dynamic parameters (e.g., id=123 from /user/123) and passes them to components.   

### Rendering Components (renderComponent and renderDynamicComponent):
Replaces the content of a `<div>` with `id="content"` with the specified component.
For dynamic routes, extracted parameters are passed to the component.   

### Navigation (navigate):
Updates the browser's URL without reloading the page and renders the appropriate component.   

### History and Link Handling (init and handleLinkClick):
Listens for popstate events (triggered by the browser's back/forward buttons) to handle navigation changes.   
Captures clicks on internal `<a>` links (hrefs starting with /) to navigate without reloading the page.   

### addRoute
This function adds all routes to Map (collections of key-value pairs) named 'routes' in this class
`'routes': key = path, value = { componentTag, isDynamic }`

```js
addRoute(path, componentTag) {
	const isDynamic = /:\w+/.test(path);
    this.routes.set(path, { componentTag, isDynamic });
}
```

This line determines if the path contains dynamic segments.
- `/regular expression/.test(path)` : 'test' methode tests if the regular expression matches any part of the string `path`   
- `\w+` : This means one or more characters(letters, digits and underscores).   
```js
const isDynamic = /:\w+/.test(path);
```

Example usage:
```js
const router = new Router();

// Static URL
router.addRoute('/login', 'login-form')  // key: '/login', value: { 'login-form', false }

// Dynamic URL
router.addRoute('/profile/:id', 'profile-page')  // key: '/profile/:id', value: { 'profile-page', true }
```

### extractParam
```js
extractParam(routePath, path) {
	
// e.g.
// routePath '/profile/:id'
// path '/profile/123'
	const routePathParts = routePath.split('/');  // --> ['', 'profile', ':id']
	const pathParts = path.split('/');            // --> ['', 'profile', '123']
	if (routePathParts.length !== pathParts.length) {
		return null;
	}
	for (let i = 0; i < routePathParts.length; i++) {
		if (routePathParts[i].startsWith(':')) {  // routePathParts[2] --> ':id' --> true
			param[routePathParts[i].slice(1)] = pathParts[i];
			// routePathParts[2] --> ':id'
			// routePathParts[2].slice(1) --> 'id'
			// pathParts[2] = '123'
			// ---> create a plain object "param" with key-value pair --> param[id] = '123'
			// key = id / value = 123
		} else if (routePathParts[i] !== pathParts[i]) {
			return null;
		}
	}
	return param;  // param = { id: '123' }
	}
```

### renderDynamicComponent

```js
renderDynamicComponent(componentTag, param) {
	// If there is a component, remove it
	if (this.currentComponent) {
		this.currentComponent.remove();
	}
	const component = document.createElement(componentTag);
	component.param = param;

	document.getElementById('content').appendChild(component);
	this.currentComponent = component;
}
```