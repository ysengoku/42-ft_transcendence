# Router class

## Define routes
```js
// This function adds all routes to Map (collections of key-value pairs) named 'routes' in this class
// 'routes': key = path, value = { componentTag, isDynamic }
addRoute(path, componentTag)

// Static URL
this.addRoute('/login', 'login-form')  // key: '/login', value: { 'login-form', false }

// Dynamic URL
this.addRoute('/profile/:id', 'profile-page')  // key: '/profile/:id', value: { 'profile-page', true }
```

## Static URL

## Dynamic URL

Example URL: `profile/123`


## Functions
### extractParam function
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

### renderDynamicComponent function

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