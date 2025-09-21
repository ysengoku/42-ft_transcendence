# Web Components
Each page is implemented as a custom element extending the HTMLElement class. Although many pages exist, they share a similar structure and behavior with minor differences in methods and content.
In this SPA, the `router` renders each component into the `<main>` element.

## Overview
The SPA is built using web components to encapsulate each page's logic and presentation.

These components:
- Extend the HTMLElement class.
- Use lifecycle callbacks (e.g., `connectedCallback`, `disconnectedCallback`) for initialization and cleanup.
- Maintain internal `state` using private class fields.
- Render UI dynamically through separate `template()` and `style()` methods.
- Integrate with other modules like `router`, `authManager` and `API data fetching`.

## Core principles

### Modularity:
Each page is self-contained, with its own module and custom element registration (e.g., customElements.define()).

### Separation of Concerns:
- Templates: HTML structure is generated in the `template()` method.
- Styles: CSS is injected via the `style()` method.

### Sub-components
Each page component may include multiple sub-components to encapsulate specific UI elements or functionality. This modular approach enhances reusability and maintainability by breaking down complex interfaces into smaller, manageable parts.

### Event Handling & State Management:
Components handle user interactions listening events and maintain internal state using private fields.

### Lifecycle Management:
`connectedCallback` is used for initialization, such as fetching data and setting up event listeners or observers.
`disconnectedCallback` is used for cleanup when the component is removed from the DOM.

### Rendering:
The render() method updates the component’s content by:
- Assigning `template()` and `style()` output to `innerHTML`
- Dynamically updating `text content` or `attributes` based on state
- Attaching `event listeners` for interactive elements.

## Basic structure of Web component

```js
class ExampleComponent extends HTMLElement {
  #state = {
    // Private class field for internal state.
    // Example: data: null,
    // Example: user: null,
  };

  constructor() {
    // Basic initialization.
    super();

    // Bind the methods being attached as event listeners.
    // Example: this.handleClick = this.handleClick.bind(this);
  }

  // Lifecycle method called when the component is connected to the DOM.
  connectedCallback() {
    // - Perform initial data fetching
    // - Fetch user's authentication status if the page is protected
    // - Call the initial render.
    this.render();
  }

  // Lifecycle method called when the component is disconnected from the DOM.
  disconnectedCallback() {
    // Cleaning up any event listeners.
    // Example: this.removeEventListener('click', this.handleClick);

    // Cancels ongoing network requests and removes any observers (if applicable).
  }

  // For dynamic URL page component (e.g. /profile/:username)
  setParam(param) {
    // Set parameters to the private state field
    // Example: this.#state.username = param.username;

    // Trigger render() if the parameter change affects the UI.
    this.render();
  }

  // For the components supporting query parameters (e.g. /singleplayer-game?type=classic)
  setQueryParam(param) {
    // Set query parameters to the private state field
    // Example: this.#state.gameType = param.get('type') || 'classic';
  }

  render() {
    // Updates the component's content by setting its innerHTML.
    // This will replace the entire content of the custom element.
    this.innerHTML = '';
    this.innerHTML = this.template() + this.style();

    // Attaches event listeners if needed.
    // Example: this.addEventListener('click', this.handleClick);
  }

  template() {
    // Returns the HTML structure.

    // Example:
    return `
      <div>
        <h1>Welcome</h1>
        <p>This is an example.</p>
      </div>
    `;
  }

  style() {
    // Returns the CSS.

    //Example:
    return `
      <style>
        .example-component {
          color: var(--pm-primary-100);
        }
      </style>
    `;
  }
}

customElements.define();
```
