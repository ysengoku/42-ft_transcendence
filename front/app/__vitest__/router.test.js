import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { router } from '@router';
import { devLog } from '@main';

describe('Router.navigate history behavior', () => {
  beforeAll(() => {
    router.addRoute('/test-route', 'test-component');
    router.addRoute('/test-replace-route', 'test-replace-component');
  });

  beforeEach(() => {
    vi.spyOn(window.history, 'replaceState').mockImplementation(() => {});
    vi.spyOn(window.history, 'pushState').mockImplementation(() => {});

    router.isFristLoad = true;
    router.pathToReplace = new Set(['/test-replace-route']);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('uses replaceState on first load', async () => {
    await router.navigate('/test-route');
    expect(window.history.replaceState).toHaveBeenCalledTimes(1);
    expect(window.history.pushState).not.toHaveBeenCalled();
  });

  it('uses replaceState when redirect flag is true', async () => {
    router.isFristLoad = false;
    await router.navigate('/test-route', {}, true);
    expect(window.history.replaceState).toHaveBeenCalled();
    expect(window.history.pushState).not.toHaveBeenCalled();
  });

  it('uses replaceState for paths in pathToReplace set', async () => {
    router.isFristLoad = false;
    await router.navigate('/test-replace-route');
    expect(window.history.replaceState).toHaveBeenCalled();
    expect(window.history.pushState).not.toHaveBeenCalled();
  });

  it('uses pushState for other paths when not first load', async () => {
    router.isFristLoad = false;
    await router.navigate('/test-route');
    expect(window.history.pushState).toHaveBeenCalled();
    expect(window.history.replaceState).not.toHaveBeenCalled();
  });

  it('pushState increments history.length by 1', async () => {
    router.isFristLoad = false;
    router.pathToReplace = new Set();
    const beforeLength = window.history.length;
    await router.navigate('/test-route');
    expect(window.history.length).toBe(beforeLength + 1);
  });

  it('replaceState does not change history.length', async () => {
    router.isFristLoad = false;
    const beforeLength = window.history.length;
    await router.navigate('/test-replace-route');
    expect(window.history.length).toBe(beforeLength);
  });
});
