import { describe, it, expect, beforeEach, afterEach } from 'vitest';

vi.mock('@socket', () => ({
  socketManager: {
    addSocket: vi.fn(),
  },
}));

// import '@testing-library/jest-dom';
import { LoginForm } from '@components/pages/login/components/LoginForm.js';
import { INPUT_FEEDBACK } from '@utils';

describe('Login Form', () => {
  let loginInstance;

  beforeEach(() => {
    document.body.innerHTML = '';
    loginInstance = document.createElement('login-form');
    document.body.appendChild(loginInstance);
  });

  afterEach(() => {
    document.body.innerHTML = '';
    vi.clearAllMocks();
  });

  it('should return false when username is empty', () => {
    const usernameField = document.getElementById('input-username');
    const passwordField = document.getElementById('input-password');

    usernameField.value = '';
    passwordField.value = 'password123';

    const result = loginInstance.checkInputs();
    expect(result).toBe(false);

    const feedbackField = document.getElementById('username-feedback');
    expect(feedbackField.textContent).toBe('Username or email is required');
    expect(usernameField.classList.contains('is-invalid')).toBe(true);
  });

  it('should return false when password is empty', () => {
    const usernameField = document.getElementById('input-username');
    const passwordField = document.getElementById('input-password');

    usernameField.value = 'username';
    passwordField.value = '';

    const result = loginInstance.checkInputs();
    expect(result).toBe(false);

    const feedbackField = document.getElementById('loginpassword-feedback');
    expect(feedbackField.textContent).toBe(INPUT_FEEDBACK.EMPTY_PASSWORD);
    expect(passwordField.classList.contains('is-invalid')).toBe(true);
  });

  it('should return true when both fields are filled', () => {
    const usernameField = document.getElementById('input-username');
    const passwordField = document.getElementById('input-password');

    usernameField.value = 'username';
    passwordField.value = 'password123';

    const result = loginInstance.checkInputs();
    expect(result).toBe(true);
  });
});
