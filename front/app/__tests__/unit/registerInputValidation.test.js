import { Register } from '../../src/js/components/pages/register/Register.js';

describe('Register Form', () => {
  const generateForm = () => `
    <form id="register-form">
        <input type="text" id="username" />
        <div id="username-feedback"></div>
        <input type="text" id="email" />
        <div id="email-feedback"></div>
        <input type="password" id="password" />
        <div id="password-feedback"></div>
        <input type="password" id="password_repeat" />
        <div id="password_repeat-feedback"></div>
    </form>
  `;

  let register;

  beforeEach(() => {
    document.body.innerHTML = generateForm();
    register = new Register();
  });

  // Clear the DOM after each test
  afterEach(() => {
    document.body.innerHTML = '';
  });

  test('should show error when username is empty', () => {
    const usernameField = document.getElementById('username');
    const feedbackSelector = '#username-feedback';
    const errorMessage = 'Username is required';

    const result = register.isFieldFilled(usernameField, feedbackSelector, errorMessage);

    // Define the expected behavior
    expect(result).toBe(false); // !isFieldFilled
    expect(usernameField.classList.contains('is-invalid')).toBe(true); // usernameField.classList.add('is-invalid');
    expect(document.querySelector(feedbackSelector).textContent).toBe(errorMessage); // errorMessage is displayed
  });

  test('should show error when email is empty', () => {
    const emailField = document.getElementById('email');
    const feedbackSelector = '#email-feedback';
    const errorMessage = 'Email is required';

    const result = register.isFieldFilled(emailField, feedbackSelector, errorMessage);

    expect(result).toBe(false);
    expect(emailField.classList.contains('is-invalid')).toBe(true);
    expect(document.querySelector(feedbackSelector).textContent).toBe(errorMessage);
  });

  test('should show error when password is empty', () => {
    const passwordField = document.getElementById('password');
    const feedbackSelector = '#password-feedback';
    const errorMessage = 'Password is required';

    const result = register.isFieldFilled(passwordField, feedbackSelector, errorMessage);

    expect(result).toBe(false);
    expect(passwordField.classList.contains('is-invalid')).toBe(true);
    expect(document.querySelector(feedbackSelector).textContent).toBe(errorMessage);
  });

  test('should show error when password repeat is empty', () => {
    const passwordRepeatField = document.getElementById('password_repeat');
    const feedbackSelector = '#password_repeat-feedback';
    const errorMessage = 'Please confirm your password';

    const result = register.isFieldFilled(passwordRepeatField, feedbackSelector, errorMessage);

    expect(result).toBe(false);
    expect(passwordRepeatField.classList.contains('is-invalid')).toBe(true);
    expect(document.querySelector(feedbackSelector).textContent).toBe(errorMessage);
  });

  test('should show error when password is too short', () => {
    const passwordField = document.getElementById('password');
    passwordField.value = '1234567';
    const errorMessage = 'Password must be at least 8 characters';

    const result = register.checkPasswordLength(passwordField);

    expect(result).toBe(false);
    expect(passwordField.classList.contains('is-invalid')).toBe(true);
    expect(document.querySelector('#password-feedback').textContent).toBe(errorMessage);
  });

  test('should show error when passwords do not match', () => {
    const passwordField = document.getElementById('password');
    const passwordRepeatField = document.getElementById('password_repeat');
    passwordField.value = 'password';
    passwordRepeatField.value = 'password1';
    const errorMessage = 'Passwords do not match';

    const result = register.checkPasswordDiff(passwordField, passwordRepeatField);

    expect(result).toBe(false);
    expect(passwordField.classList.contains('is-invalid')).toBe(true);
    expect(passwordRepeatField.classList.contains('is-invalid')).toBe(true);
    expect(document.querySelector('#password-feedback').textContent).toBe(errorMessage);
    expect(document.querySelector('#password_repeat-feedback').textContent).toBe(errorMessage);
  });
});
