import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { isMobile, BREAKPOINT } from '../src/js/utils/viewPort.js';

describe('isMobile', () => {
  let originalInnerWidth;
  let originalGetComputedStyle;

  beforeEach(() => {
    originalInnerWidth = window.innerWidth;
    originalGetComputedStyle = window.getComputedStyle;
    window.getComputedStyle = () => ({
      getPropertyValue: () => '768',
    });
  });

  afterEach(() => {
    window.innerWidth = originalInnerWidth;
    window.getComputedStyle = originalGetComputedStyle;
  });

  it('returns true if window.innerWidth < breakpoint', () => {
    window.innerWidth = 500;
    expect(isMobile()).toBe(true);
  });

  it('returns false if window.innerWidth >= breakpoint', () => {
    window.innerWidth = 900;
    expect(isMobile()).toBe(false);
  });

  it('uses default 768 if CSS var is not set', () => {
    window.getComputedStyle = () => ({
      getPropertyValue: () => '',
    });
    window.innerWidth = 700;
    expect(isMobile()).toBe(true);
    window.innerWidth = 800;
    expect(isMobile()).toBe(false);
  });
});
