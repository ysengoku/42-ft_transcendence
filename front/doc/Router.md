# Router module

`router` provides a simple client-side routing system for a single-page application (SPA).
It maps URL paths to custom HTML components, supports dynamic routing with parameter extraction, and handles navigation events using browser history manipulation.

## Overview

- Defines routes that map URL paths to specific components.
- Supports both static (e.g., `/home`) and dynamic routes (e.g., `/user/:id`)
- Renders components dynamically
- Updates browser history using pushState
- Supports browser back/forward navigation

## Router class
The core functionality is encapsulated in the Router class using an IIFE (Immediately Invoked Function Expression), which is instantiated immediately and exported, so it's implemented as a singleton. This ensures that all parts of your application share the same Router instance and its state.

### Methodes

#### addRoute(path, componentTag, isDynamic = false)
Adds a new route to the router.

##### Parameters
- path(string): The URL path for the route
- componentTag(string): The custome HTML tag for the component to render
- isDynamic(boolean): Indicates if the route is dynamic (includes a parameter).

##### Example
```js
router.addRoute('/home', 'user-home');
router.addRoute('/profile/:id', 'user-profile', true);
```


#### handleRoute(queryParams = '')
Handles route changes and renders the correct component based on the current URL.

##### Parameters
- queryParams(URLSearchParams object):  Query parameters from the URL.


#### matchDynamicRoute(path)
Tries to match a dynamic route by checking each route marked as dynamic.

##### Parameters
- path (string): The current URL path.

##### Returns
An object containing the following if a match is found:
- componentTag
- isDynamic
- param (the extracted parameter(s))
- Returns `null` if no matching dynamic route is found.


#### extractParam(routePath, path)
Extracts parameters from the URL based on a defined dynamic route.

##### Parameters
- routePath (string): The defined dynamic route (e.g., /reset-password/:token).
- path (string): The actual URL (e.g., /reset-password/abc123).

##### Returns
An object with `key-value pairs` corresponding to the dynamic segments if the route matches; otherwise, null.


#### renderStaticUrlComponent(componentTag, queryParams = '')
Renders a static URL component by creating the component element and appending it to the page.

##### Parameters
- componentTag (string): The custom HTML tag of the component.
- queryParams (optional): Query parameters to pass to the component.

##### Behavior
- Removes the current component if it exists.
- Creates the component using `document.createElement(componentTag)`.
- Appends the component to the `content` element.


#### renderDynamicUrlComponent(componentTag, param)
Renders a dynamic component, supplying URL parameters to the component.

##### Parameters
- componentTag (string): The custom HTML tag of the component.
- param (Object): The parameters extracted from the URL

##### Behavior
- Removes the current component if it exists.
- Creates the component and, if available, calls its setParam method with the extracted parameters.
- Appends the component to the `content` element.


#### navigate(path = window.location.pathname, queryParams = '')
Performs navigation by updating the browser history and rendering the corresponding component.

##### Parameters
- path (string, optional): The destination URL path. Defaults to the current pathname.
- queryParams (optional): Query parameters to include during navigation.

##### Behavior
- Uses `window.history.pushState` (or `replaceState` for specific paths) to update the URL.
- Calls `handleRoute` to render the appropriate component.


#### init()
Initializes the router by setting up the necessary event listeners.

##### Behavior
- Listens for the `popstate event` to handle back/forward navigation.
- Intercepts click events on internal links to perform client-side navigation.


#### handleLinkClick(event)
Handles click events on internal links to enable seamless navigation without a full page reload.

##### Parameters
- event(Event): The click event triggered on an internal link.

##### Behavior
- Checks if the click target is an anchor (`<a>`) with an `href` starting with `/`.
- Prevents the default browser behavior and calls navigate with the specified path.


### Initialization
When the DOM is fully loaded (DOMContentLoaded event), the following sequence occurs:

#### Theme-Based Styling
Sets the document’s background image based on the data-bs-theme attribute.

For the light theme, a warm gradient is applied.
Otherwise, a darker gradient is set.

#### Authentication
Calls auth.fetchAuthStatus() to fetch the current authentication status.

#### Navbar Rendering
Renders the navigation bar by inserting <navbar-component> into the element with the ID navbar-container.

#### Router Initialization
Initializes the router by calling router.init(), which sets up the event listeners for popstate and internal link clicks.

#### Alert Dismissal
Activates alert dismissal functionality by calling addDissmissAlertListener().

#### Initial Navigation
Retrieves the current URL path and query parameters and calls router.navigate() to render the correct component.


### Export
The module exports the instantiated router so that it can be imported and used throughout the application.

### Example usage
```js
import { router } from './router.js';

// Add a new route for the About page
router.addRoute('/home', 'user-home');

// Navigate to the About page
router.navigate('/home');
```