import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@socket', () => ({
  socketManager: {
    addSocket: vi.fn(),
    openSocket: vi.fn(),
    closeSocket: vi.fn(),
  },
}));

globalThis.log = {};
globalThis.log.info = vi.fn();
globalThis.log.error = vi.fn();

import { __test__ } from '@router';
const { extractParam, matchDynamicRoute, navigate, router } = __test__;

describe('extractParam', () => {
  it('should extract username', () => {
    expect(extractParam('/profile/:username', '/profile/alice')).toStrictEqual({ username: 'alice' });
  });

  it('should extract id', () => {
    expect(extractParam('/multiplayer-game/:id', '/multiplayer-game/12345')).toStrictEqual({ id: '12345' });
  });

  it('should return null if static parts do not match', () => {
    expect(extractParam('/profile/:username', '/user/alice')).toBeNull();
  });

  it('should return null if segments count mismatch', () => {
    expect(extractParam('/profile/:username', '/profile/alice/user')).toBeNull();
  });

  it('should return null if dynamic segment missing', () => {
    expect(extractParam('/profile/:id', '/profile')).toBeNull();
  });
});

describe('matchDynamicRoute', () => {
  beforeEach(() => {
    router.routes.clear();
    router.addRoute('/test/:id', 'test-page', true);
    router.addRoute('/test-profile/:username', 'test-profile-page', true);
    router.addRoute('/static-test', 'static-test-page', false);
  });

  it('should match a dynamic route and return component and param', () => {
    expect(matchDynamicRoute('/test/12345')).toStrictEqual({
      componentTag: 'test-page',
      isDynamic: true,
      param: { id: '12345' },
    });
    expect(matchDynamicRoute('/test-profile/alice')).toStrictEqual({
      componentTag: 'test-profile-page',
      isDynamic: true,
      param: { username: 'alice' },
    });
  });

  it('should return null if no dynamic route matches', () => {
    expect(matchDynamicRoute('/tests/12345')).toBeNull();
    expect(matchDynamicRoute('/test/12345/abc')).toBeNull();
  });

  it('should ignore static routes', () => {
    expect(matchDynamicRoute('/static-test')).toBeNull();
  });
});

describe('renderStaticUrlComponent', () => {
  let container;
  beforeEach(() => {
    container = document.createElement('div');
    container.id = 'content';
    document.body.innerHTML = '';
    document.body.appendChild(container);
  });

  it('should append component to container', () => {
    router.renderStaticUrlComponent('test-component');
    const appendedElement = container.querySelector('test-component');

    expect(appendedElement).not.toBeNull();
    expect(router.currentComponent).toBe(appendedElement);
  });

  it('should remove current component if it exists', () => {
    const current = document.createElement('current');
    current.remove = vi.fn();
    router.currentComponent = current;
    container.appendChild(current);

    router.renderStaticUrlComponent('new');
    expect(current.remove).toHaveBeenCalled();
  });

  it('should call setQueryParam if queryParams is provided', () => {
    const testComponentTag = 'test-component';
    customElements.define(
      testComponentTag,
      class extends HTMLElement {
        setQueryParam(q) {
          this._param = q;
        }
      },
    );

    const queryParam = new URLSearchParams({ status: '12345' });
    router.renderStaticUrlComponent(testComponentTag, queryParam);

    const element = container.querySelector(testComponentTag);
    expect(element._param).toEqual(queryParam);
  });
});

describe('renderDynamicUrlComponent', () => {
  let container;
  beforeEach(() => {
    container = document.createElement('div');
    container.id = 'content';
    document.body.innerHTML = '';
    document.body.appendChild(container);
  });

  it('should append component to container', () => {
    router.renderDynamicUrlComponent('test-component');
    const appendedElement = container.querySelector('test-component');

    expect(appendedElement).not.toBeNull();
    expect(router.currentComponent).toBe(appendedElement);
  });

  it('should remove current component if it exists', () => {
    const current = document.createElement('current');
    current.remove = vi.fn();
    router.currentComponent = current;
    container.appendChild(current);

    router.renderDynamicUrlComponent('new');
    expect(current.remove).toHaveBeenCalled();
  });

  it('should call setParam', () => {
    const testComponentTag = 'dynamic-url-test-component';
    customElements.define(
      testComponentTag,
      class extends HTMLElement {
        setParam(p) {
          this._param = p;
        }
      },
    );

    const param = { id: '12345' };
    router.renderDynamicUrlComponent(testComponentTag, param);

    const element = container.querySelector(testComponentTag);
    expect(element._param).toEqual(param);
  });
});

describe('navigate', () => {
  beforeEach(() => {
    router.routes.clear();
    router.isFirstLoad = false;
    router.beforeunloadCallback = null;
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should use pushState if redirect and first load are false', async () => {
    const handleRouteSpy = vi.spyOn(router, 'handleRoute');
    const pushStateSpy = vi.spyOn(window.history, 'pushState');
    const replaceStateSpy = vi.spyOn(window.history, 'replaceState');
    const emptyQueryParam = new URLSearchParams('');
    await navigate('/test', '', false);

    expect(handleRouteSpy).toHaveBeenCalledWith(emptyQueryParam);
    expect(pushStateSpy).toHaveBeenCalledWith({}, '', '/test');
    expect(replaceStateSpy).not.toHaveBeenCalled();
  });

  it('should use replaceState if redirect is true', async () => {
    const handleRouteSpy = vi.spyOn(router, 'handleRoute');
    const replaceStateSpy = vi.spyOn(window.history, 'replaceState');
    const pushStateSpy = vi.spyOn(window.history, 'pushState');
    const emptyQueryParam = new URLSearchParams('');
    await navigate('/test', '', true);

    expect(handleRouteSpy).toHaveBeenCalledWith(emptyQueryParam);
    expect(replaceStateSpy).toHaveBeenCalledWith({}, '', '/test');
    expect(pushStateSpy).not.toHaveBeenCalled();
  });

  it('should use replaceState if first load is true', async () => {
    router.isFirstLoad = true;
    const handleRouteSpy = vi.spyOn(router, 'handleRoute');
    const replaceStateSpy = vi.spyOn(window.history, 'replaceState');
    const pushStateSpy = vi.spyOn(window.history, 'pushState');
    const emptyQueryParam = new URLSearchParams('');
    await navigate('/test', '', false);

    expect(handleRouteSpy).toHaveBeenCalledWith(emptyQueryParam);
    expect(replaceStateSpy).toHaveBeenCalledWith({}, '', '/test');
    expect(pushStateSpy).not.toHaveBeenCalled();
  });

  it('should convert object queryParams to URLSearchParams', async () => {
    const handleRouteSpy = vi.spyOn(router, 'handleRoute');
    await navigate('/test', { status: '123' });

    const arg = handleRouteSpy.mock.calls[0][0];
    expect(arg instanceof URLSearchParams).toBe(true);
    expect(arg.get('status')).toBe('123');
  });

  it('should convert queryParams in string to URLSearchParams', async () => {
    const handleRouteSpy = vi.spyOn(router, 'handleRoute');
    await navigate('/test', 'status=123&message=test');

    const arg = handleRouteSpy.mock.calls[0][0];
    expect(arg instanceof URLSearchParams).toBe(true);
    expect(arg.get('status')).toBe('123');
    expect(arg.get('message')).toBe('test');
  });

  it('should pass queryParams in URLSearchParams', async () => {
    const handleRouteSpy = vi.spyOn(router, 'handleRoute');
    const query = new URLSearchParams({ status: '123' });
    await navigate('/test', query);

    const arg = handleRouteSpy.mock.calls[0][0];
    expect(arg.get('status')).toBe('123');
  });

  it('should not proceed if beforeunloadCallback returns false', async () => {
    router.beforeunloadCallback = vi.fn().mockResolvedValue(false);
    const handleRouteSpy = vi.spyOn(router, 'handleRoute');
    const pushStateSpy = vi.spyOn(window.history, 'pushState');

    await router.navigate('/test');
    expect(router.beforeunloadCallback).toHaveBeenCalled();
    expect(handleRouteSpy).not.toHaveBeenCalled();
    expect(pushStateSpy).not.toHaveBeenCalled();
  });

  it('should proceed if beforeunloadCallback returns true', async () => {
    const beforeUnloadSpy = vi.fn().mockResolvedValue(true);
    router.beforeunloadCallback = beforeUnloadSpy;
    const handleRouteSpy = vi.spyOn(router, 'handleRoute');
    const pushStateSpy = vi.spyOn(window.history, 'pushState');

    await router.navigate('/test');
    expect(beforeUnloadSpy).toHaveBeenCalled();
    expect(handleRouteSpy).toHaveBeenCalled();
    expect(pushStateSpy).toHaveBeenCalled();
  });

  it('should parse URL containing query and update history, pass URLSearchParams to handleRoute and include query in pushState', async () => {
    const handleRouteSpy = vi.spyOn(router, 'handleRoute');
    const pushStateSpy = vi.spyOn(window.history, 'pushState');
    const replaceStateSpy = vi.spyOn(window.history, 'replaceState');

    await router.navigate('/test?type=123&message=test');

    const arg = handleRouteSpy.mock.calls[0][0];
    expect(arg instanceof URLSearchParams).toBe(true);
    expect(arg.get('type')).toBe('123');
    expect(arg.get('message')).toBe('test');

    expect(pushStateSpy).toHaveBeenCalled();
    const calledUrl = pushStateSpy.mock.calls[0][2];
    expect(calledUrl.startsWith('/test?')).toBe(true);
    expect(calledUrl).toContain('type=123');
    expect(calledUrl).toContain('message=test');

    expect(replaceStateSpy).not.toHaveBeenCalled();
  });

  it('should pass URLSearchParams to handleRoute and include query string in pushState URL when query string provided', async () => {
    router.isFirstLoad = false;
    router.beforeunloadCallback = null;

    const handleRouteSpy = vi.spyOn(router, 'handleRoute');
    const pushStateSpy = vi.spyOn(window.history, 'pushState');
    const replaceStateSpy = vi.spyOn(window.history, 'replaceState');

    await router.navigate('/test', 'type=123&message=test', false);

    const arg = handleRouteSpy.mock.calls[0][0];
    expect(arg instanceof URLSearchParams).toBe(true);
    expect(arg.get('type')).toBe('123');
    expect(arg.get('message')).toBe('test');

    expect(pushStateSpy).toHaveBeenCalled();
    const calledUrl = pushStateSpy.mock.calls[0][2];
    expect(calledUrl.startsWith('/test?')).toBe(true);
    expect(calledUrl).toContain('type=123');
    expect(calledUrl).toContain('message=test');

    expect(replaceStateSpy).not.toHaveBeenCalled();
  });

  it('should pass URLSearchParams to handleRoute and include object queryParams in pushState URL', async () => {
    router.isFirstLoad = false;
    router.beforeunloadCallback = null;

    const handleRouteSpy = vi.spyOn(router, 'handleRoute');
    const pushStateSpy = vi.spyOn(window.history, 'pushState');
    const replaceStateSpy = vi.spyOn(window.history, 'replaceState');

    await router.navigate('/test', { type: '123', option: '2' }, false);

    const arg = handleRouteSpy.mock.calls[0][0];
    expect(arg.get('type')).toBe('123');
    expect(arg.get('option')).toBe('2');

    expect(pushStateSpy).toHaveBeenCalled();
    const calledUrl = pushStateSpy.mock.calls[0][2];
    expect(calledUrl.startsWith('/test?')).toBe(true);
    expect(calledUrl).toContain('type=123');
    expect(calledUrl).toContain('option=2');

    expect(replaceStateSpy).not.toHaveBeenCalled();
  });
});

describe('handleLinkClick', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should call navigate when clicking on internal link', () => {
    const mockClickEvent = {
      target: document.createElement('a'),
      preventDefault: vi.fn(),
    };
    mockClickEvent.target.setAttribute('href', '/test');
    const navigateSpy = vi.spyOn(router, 'navigate');
    router.handleLinkClick(mockClickEvent);

    expect(mockClickEvent.preventDefault).toHaveBeenCalled();
    expect(navigateSpy).toHaveBeenCalledWith('/test');
  });

  it('should not call navigate when clicking non-anchor elements', () => {
    const mockClickEvent = {
      target: document.createElement('div'),
      preventDefault: vi.fn(),
    };
    const navigateSpy = vi.spyOn(router, 'navigate');
    router.handleLinkClick(mockClickEvent);

    expect(mockClickEvent.preventDefault).not.toHaveBeenCalled();
    expect(navigateSpy).not.toHaveBeenCalled();
  });

  it('should not call navigate when clicking on external link', () => {
    const mockClickEvent = {
      target: document.createElement('a'),
      preventDefault: vi.fn(),
    };
    mockClickEvent.target.setAttribute('href', 'https://externaklink.com');
    const navigateSpy = vi.spyOn(router, 'navigate');
    router.handleLinkClick(mockClickEvent);

    expect(mockClickEvent.preventDefault).not.toHaveBeenCalled();
    expect(navigateSpy).not.toHaveBeenCalled();
  });
});
