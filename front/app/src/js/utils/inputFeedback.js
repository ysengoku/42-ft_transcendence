export const INPUT_FEEDBACK = {
  EMPTY_USERNAME: `Username is required`,
  EMPTY_EMAIL: `Email is required`,
  EMPTY_OLD_PASSWORD: `Old password is required`,
  EMPTY_PASSWORD: `Password is required`,
  EMPTY_PASSWORD_REPEAT: `Please confirm your password`,
  PASSWORD_TOO_SHORT: `Password must be at least 8 characters`,
  PASSWORDS_NOT_MATCH: `Passwords do not match`,
  CANNOT_DELETE_USERNAME: `You cannot delete username.`,
  CANNOT_DELETE_NICKNAME: `You cannot delete nickname.`,
  CANNOT_DELETE_EMAIL: `You cannot delete email.`,
};

export function isFieldFilled(field, feedbackSelector, errorMessage) {
  if (!field.value.trim()) {
    field.classList.add('is-invalid');
    document.querySelector(feedbackSelector).textContent = errorMessage;
    return false;
  } else {
    return true;
  }
}

export function passwordFeedback(passwordField, passwordRepeatField, feedbackSelector, feedbackSelectorRepeat) {
  let isFormValid = true;
  isFormValid = checkPasswordDiff(passwordField, passwordRepeatField, feedbackSelector, feedbackSelectorRepeat) && isFormValid;
  isFormValid = checkPasswordLength(passwordField, feedbackSelector) && isFormValid;
  isFormValid = checkPasswordLength(passwordRepeatField, feedbackSelectorRepeat) && isFormValid;
  return isFormValid;
}

function checkPasswordLength(passwordField, feedbackSelector) {
  if (passwordField.value.length < 8) {
    passwordField.classList.add('is-invalid');
    document.querySelector(feedbackSelector).textContent = INPUT_FEEDBACK.PASSWORD_TOO_SHORT;
    return false;
  } else {
    return true;
  }
}

function checkPasswordDiff(passwordField, passwordRepeatField, feedbackSelector, feedbackSelectorRepeat) {
  const passwordsDoNotMatch = INPUT_FEEDBACK.PASSWORDS_NOT_MATCH;
  if (passwordField.value != passwordRepeatField.value) {
    passwordField.classList.add('is-invalid');
    passwordRepeatField.classList.add('is-invalid');
    document.querySelector(feedbackSelector).textContent = passwordsDoNotMatch;
    document.querySelector(feedbackSelectorRepeat).textContent = passwordsDoNotMatch;
    return false;
  } else {
    return true;
  }
}
