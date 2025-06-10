import { LoginForm } from '../../../app/src/js/components/pages/login/components/LoginForm.js';

describe('Login Form', () => {
  const generateForm = () => `
    <form id="loginForm">
      <input type="text" class="form-control" id="inputUsername" placeholder="username or email" autocomplete="off">
      <div class='invalid-feedback' id='username-feedback'></div>

      <input type="password" class="form-control" id="inputPassword" placeholder="password" autocomplete="off">
      <div class='invalid-feedback' id='loginpassword-feedback'></div>
    </form>
    `;

  let login;

  beforeEach(() => {
    document.body.innerHTML = generateForm();
    login = new LoginForm();
    document.body.appendChild(login);
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  test('should show error when username is empty', () => {
    const usernameField = document.getElementById('inputUsername');
    const passwordField = document.getElementById('inputPassword');

    usernameField.value = '';
    passwordField.value = 'password';

    const result = login.checkInputs();

    expect(result).toBe(false);
  });

  test('should show error when password is empty', () => {
    const usernameField = document.getElementById('inputUsername');
    const passwordField = document.getElementById('inputPassword');

    usernameField.value = 'username';
    passwordField.value = '';

    const result = login.checkInputs();

    expect(result).toBe(false);
  });
});
