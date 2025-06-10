import { Register } from '../../src/js/components/pages/register/Register.js';
import { isFieldFilled, passwordFeedback } from '@utils';

describe('Register Form Validation Utils', () => {
  const generateForm = () => `
    <form id="register-form">
        <input type="text" id="username" />
        <div id="username-feedback"></div>
        <input type="text" id="email" />
        <div id="email-feedback"></div>
        <input type="password" id="password" />
        <div id="password-feedback"></div>
        <input type="password" id="password_repeat" />
        <div id="password-repeat-feedback"></div>
    </form>
  `;

  beforeEach(() => {
    document.body.innerHTML = generateForm();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  test('should show error when username is empty', () => {
    const usernameField = document.getElementById('username');
    const feedback = document.getElementById('username-feedback');
    const errorMessage = 'Username is required';

    const result = isFieldFilled(usernameField, feedback, errorMessage);

    expect(result).toBe(false);
    expect(usernameField.classList.contains('is-invalid')).toBe(true);
    expect(feedback.textContent).toBe(errorMessage);
  });

  test('should show error when passwords do not match', () => {
    const passwordField = document.getElementById('password');
    const passwordRepeatField = document.getElementById('password_repeat');
    const passwordFeedbackField = document.getElementById('password-feedback');
    const repeatFeedbackField = document.getElementById('password-repeat-feedback');

    passwordField.value = 'password123';
    passwordRepeatField.value = 'differentpass';

    const result = passwordFeedback(passwordField, passwordRepeatField, passwordFeedbackField, repeatFeedbackField);

    expect(result).toBe(false);
    expect(passwordField.classList.contains('is-invalid')).toBe(true);
    expect(passwordRepeatField.classList.contains('is-invalid')).toBe(true);
    expect(passwordFeedbackField.textContent).toBe('Passwords do not match');
    expect(repeatFeedbackField.textContent).toBe('Passwords do not match');
  });
});
