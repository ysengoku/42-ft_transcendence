import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ThemeController } from '../src/js/utils/ThemeController.js';

describe('ThemeController', () => {
  let originalSetAttribute;

	beforeEach(() => {
	  const localStorageMock = {
	    getItem: vi.fn(),
	    setItem: vi.fn(),
	    removeItem: vi.fn()
	  };
	  Object.defineProperty(window, 'localStorage', {
	    value: localStorageMock,
	    writable: true,
	    configurable: true,
	  });

	  originalSetAttribute = document.documentElement.setAttribute;
	  document.documentElement.setAttribute = vi.fn();
	});

  afterEach(() => {
  	vi.restoreAllMocks();
  	document.documentElement.setAttribute = originalSetAttribute;
  });

  it('getTheme returns value from localStorage or "light"', () => {
    window.localStorage.getItem.mockReturnValueOnce('dark');
    expect(ThemeController.getTheme()).toBe('dark');
    window.localStorage.getItem.mockReturnValueOnce(null);
    expect(ThemeController.getTheme()).toBe('light');
  });

  it('setTheme sets attribute and localStorage', () => {
    ThemeController.setTheme('dark');
    expect(document.documentElement.setAttribute).toHaveBeenCalledWith('data-bs-theme', 'dark');
    expect(window.localStorage.setItem).toHaveBeenCalledWith('theme', 'dark');
  });

  it('toggleTheme toggles theme and returns new value', () => {
    window.localStorage.getItem.mockReturnValueOnce('light');
    ThemeController.setTheme = vi.fn();
    const result = ThemeController.toggleTheme();
    expect(result).toBe('dark');
    expect(ThemeController.setTheme).toHaveBeenCalledWith('dark');
  });

  it('init sets attribute to current theme', () => {
    ThemeController.getTheme = vi.fn(() => 'dark');
    ThemeController.init();
    expect(document.documentElement.setAttribute).toHaveBeenCalledWith('data-bs-theme', 'dark');
  });
});
