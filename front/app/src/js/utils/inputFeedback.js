export const INPUT_FEEDBACK = {
  EMPTY_USERNAME: `Username is required`,
  EMPTY_EMAIL: `Email is required`,
  EMPTY_OLD_PASSWORD: `Old password is required`,
  EMPTY_PASSWORD: `Password is required`,
  EMPTY_PASSWORD_REPEAT: `Please confirm your password`,
  INVALID_EMAIL: `Invalid email address`,
  PASSWORD_TOO_SHORT: `Password must be at least 8 characters`,
  PASSWORDS_NOT_MATCH: `Passwords do not match`,
  CANNOT_DELETE_USERNAME: `You cannot delete username.`,
  CANNOT_DELETE_NICKNAME: `You cannot delete nickname.`,
  CANNOT_DELETE_EMAIL: `You cannot delete email.`,
};

export function isFieldFilled(field, feedbackFeeld, errorMessage) {
  if (!field.value.trim()) {
    field.classList.add('is-invalid');
    feedbackFeeld.textContent = errorMessage;
    return false;
  } else {
    return true;
  }
}

export function emailFeedback(emailField, feedbackField) {
  if (!isFieldFilled(emailField, feedbackField, INPUT_FEEDBACK.EMPTY_EMAIL)) {
    return false;
  }
  const email = emailField.value;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isValid = emailRegex.test(email);
  if (!isValid) {
    emailField.classList.add('is-invalid');
    feedbackField.textContent = INPUT_FEEDBACK.INVALID_EMAIL;
  }
  return isValid;
}

export function passwordFeedback(passwordField, passwordRepeatField, feedbackField, feedbackRepeatField) {
  let isFormValid = true;
  isFormValid =
    checkPasswordDiff(passwordField, passwordRepeatField, feedbackField, feedbackRepeatField) && isFormValid;
  isFormValid = checkPasswordLength(passwordField, feedbackField) && isFormValid;
  isFormValid = checkPasswordLength(passwordRepeatField, feedbackRepeatField) && isFormValid;
  return isFormValid;
}

function checkPasswordLength(passwordField, feedbackField) {
  if (passwordField.value.length < 8) {
    passwordField.classList.add('is-invalid');
    feedbackField.textContent = INPUT_FEEDBACK.PASSWORD_TOO_SHORT;
    return false;
  } else {
    return true;
  }
}

function checkPasswordDiff(passwordField, passwordRepeatField, feedbackField, feedbackRepeatField) {
  const passwordsDoNotMatch = INPUT_FEEDBACK.PASSWORDS_NOT_MATCH;
  if (passwordField.value != passwordRepeatField.value) {
    passwordField.classList.add('is-invalid');
    passwordRepeatField.classList.add('is-invalid');
    feedbackField.textContent = passwordsDoNotMatch;
    feedbackRepeatField.textContent = passwordsDoNotMatch;
    return false;
  } else {
    return true;
  }
}

export function removeInputFeedback(event, feedbackField) {
  event.target.classList.remove('is-invalid');
  feedbackField.innerHTML = '';
}
