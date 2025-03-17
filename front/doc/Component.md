# Web Components
Each page is implemented as a custom element extending the HTMLElement class. Although many pages exist, they share a similar structure and behavior with minor differences in methods and content.
In this SPA, the `router` renders each component into the <main> element.

## Overview
The SPA is built using web components to encapsulate each page's logic and presentation.

These components:
- Extend the HTMLElement class.
- Use lifecycle callbacks (e.g., `connectedCallback`, `disconnectedCallback`) for initialization and cleanup.
- Maintain internal `state` using private class fields.
- Render UI dynamically through separate `template()` and `style()` methods.
- Integrate with other modules like `router`, `authManager` and `API data fetching`.

## Architecture & Patterns
The components follow a common design pattern:

### Modularity:
Each page is self-contained, with its own module and custom element registration (e.g., customElements.define()).

### Separation of Concerns:
- Templates: HTML structure is generated in the `template()` method.
- Styles: CSS is injected via the `style()` method, sometimes dynamically based on application state (e.g., theme changes).

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
