export function isMobile() {
  const breakpoint = parseInt(
      getComputedStyle(document.documentElement).getPropertyValue('--bs-breakpoint-md'),
      10) || 768;
  return window.innerWidth < breakpoint;
}
