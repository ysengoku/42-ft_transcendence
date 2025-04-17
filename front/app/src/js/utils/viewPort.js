export function isMobile() {
  const breakpoint = parseInt(
      getComputedStyle(document.documentElement).getPropertyValue('--bs-breakpoint-md'),
      10) || 768;
  return window.innerWidth < breakpoint;
};

export const BREAKPOINT = {
  SM: 576,
  MD: 768,
  LG: 992,
  XL: 1200,
  XXL: 1400,
};
