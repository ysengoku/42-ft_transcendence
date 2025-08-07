/**
 * @description
 * Sets up the IntersectionObserver to lazy load more items when the user scrolls to the bottom of the list.
 * It creates a load more anchor element and observes it for intersection changes.
 * When the anchor is intersecting, callback function is called.
 * @returns {IntersectionObserver, HTMLElement}
 */
export function setupObserver(rootElement, callback, rootMargin = '0px 0px 64px 0px') {
  const anchor = document.createElement('li');
  anchor.classList.add('list-group-item', 'dropdown-list-item', 'p-0', 'border-0');
  rootElement.appendChild(anchor);

  const observer = new IntersectionObserver(callback, {
    root: rootElement,
    rootMargin: rootMargin,
    threshold: 0.1,
  });
  observer.observe(anchor);
  return [observer, anchor];
}
