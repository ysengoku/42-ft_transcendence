# Router module

`Router` provides a simple client-side routing system for a single-page application (SPA). It allows dynamic navigation between different views without reloading the page.

## Key Features

### Routes Management (addRoute):

- Supports static (e.g., `/home`) and dynamic routes (e.g., `/user/:id`)
- Handles authentication-required routes 
- Renders components dynamically
- Updates browser history using pushState
- Supports browser back/forward navigation

### Usage

#### Intallation
No installation is required. Simply import the module into your project:
```js
import { router } from 'src/js/router.js'
// or
// With vite alias
import { router } from '@router'; 
```

#### Define routes
Routes can be added using router.addRoute(path, componentTag, isDynamic, requiresAuth).   
Example:
```js
router.addRoute('/', 'landing-component');
router.addRoute('/home', 'user-home', false, true);
router.addRoute('/profile/:username', 'user-profile', true, true);
```

#### Navigate between pages
Use router.navigate(path) to change routes dynamically.   
Examples:
```js
document.querySelector('a').addEventListener('click', (event) => {
  event.preventDefault();
  router.navigate('/home');
});
```
```js
<a class="btn btn-outline-primary" href="/profile/${this.user.username}" role="button">Profile</a>
// This will trigger the handleLinkClick(event) methode on click.
```

### History and Link Handling

Listens for popstate events (triggered by the browser's back/forward buttons) to handle navigation changes.  
Captures clicks on internal `<a>` links (hrefs starting with /) to navigate without reloading the page.
