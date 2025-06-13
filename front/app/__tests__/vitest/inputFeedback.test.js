import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MAX_NAME_LENGTH, MIN_PASSWORD_LENGTH } from '@env';

vi.mock('@env', () => ({
  MAX_NAME_LENGTH: 5,
  MIN_PASSWORD_LENGTH: 8,
}));

import {
  INPUT_FEEDBACK,
  isFieldFilled,
  usernameFeedback,
  nicknameFeedback,
  emailFeedback,
  passwordFeedback,
} from '@utils';

function createMockField(value = '') {
  return {
    value,
    classList: {
      classes: new Set(),
      add(className) {
        this.classes.add(className);
      },
      remove(className) {
        this.classes.delete(className);
      },
    },
  };
}

function createMockFeedbackField() {
  return { textContent: '', innerHTML: '' };
}

describe('isFieldFilled', () => {
  let field, feedbackField;
  beforeEach(() => {
    field = createMockField();
    feedbackField = createMockFeedbackField();
  });

  it('should return false and set error message for empty field', () => {
    const result = isFieldFilled(field, feedbackField, INPUT_FEEDBACK.EMPTY_USERNAME);
    expect(result).toBe(false);
    expect(field.classList.classes.has('is-invalid')).toBe(true);
    expect(feedbackField.textContent).toBe(INPUT_FEEDBACK.EMPTY_USERNAME);
  });

  it('should return true for filled field', () => {
    field.value = 'test';
    const result = isFieldFilled(field, feedbackField, INPUT_FEEDBACK.EMPTY_USERNAME);
    expect(result).toBe(true);
    expect(field.classList.classes.has('is-invalid')).toBe(false);
    expect(feedbackField.textContent).toBe('');
  });
});

describe('usernameFeedback', () => {
  let field, feedbackField;
  beforeEach(() => {
    field = createMockField();
    feedbackField = createMockFeedbackField();
  });

  it('should return false and set error message for empty username', () => {
    const result = usernameFeedback(field, feedbackField);
    expect(result).toBe(false);
    expect(field.classList.classes.has('is-invalid')).toBe(true);
    expect(feedbackField.textContent).toBe(INPUT_FEEDBACK.EMPTY_USERNAME);
  });

  it('should return false and set error message for too long username', () => {
    field.value = 'a'.repeat(MAX_NAME_LENGTH + 1);
    const result = usernameFeedback(field, feedbackField);
    expect(result).toBe(false);
    expect(field.classList.classes.has('is-invalid')).toBe(true);
    expect(feedbackField.textContent).toBe(INPUT_FEEDBACK.USERNAME_TOO_LONG);
  });

  it('should return true for valid username', () => {
    field.value = 'valid';
    const result = usernameFeedback(field, feedbackField);
    expect(result).toBe(true);
    expect(field.classList.classes.has('is-invalid')).toBe(false);
    expect(feedbackField.textContent).toBe('');
  });
});

describe('nicknameFeedback', () => {
  let field, feedbackField;
  beforeEach(() => {
    field = createMockField();
    feedbackField = createMockFeedbackField();
  });

  it('should return false and set error message for empty nickname', () => {
    const result = nicknameFeedback(field, feedbackField);
    expect(result).toBe(false);
    expect(field.classList.classes.has('is-invalid')).toBe(true);
    expect(feedbackField.textContent).toBe(INPUT_FEEDBACK.EMPTY_NICKNAME);
  });

  it('should return false and set error message for too long nickname', () => {
    field.value = 'a'.repeat(MAX_NAME_LENGTH + 1);
    const result = nicknameFeedback(field, feedbackField);
    expect(result).toBe(false);
    expect(field.classList.classes.has('is-invalid')).toBe(true);
    expect(feedbackField.textContent).toBe(INPUT_FEEDBACK.NICKNAME_TOO_LONG);
  });

  it('should return true for valid nickname', () => {
    field.value = 'valid';
    const result = nicknameFeedback(field, feedbackField);
    expect(result).toBe(true);
    expect(field.classList.classes.has('is-invalid')).toBe(false);
    expect(feedbackField.textContent).toBe('');
  });
});

describe('emailFeedback', () => {
  let field, feedbackField;
  beforeEach(() => {
    field = createMockField();
    feedbackField = createMockFeedbackField();
  });

  it('should return false and set error message for empty email', () => {
    const result = emailFeedback(field, feedbackField);
    expect(result).toBe(false);
    expect(field.classList.classes.has('is-invalid')).toBe(true);
    expect(feedbackField.textContent).toBe(INPUT_FEEDBACK.EMPTY_EMAIL);
  });

  it('should return false and set error message for invalid email', () => {
    field.value = 'invalid-email';
    const result = emailFeedback(field, feedbackField);
    expect(result).toBe(false);
    expect(field.classList.classes.has('is-invalid')).toBe(true);
    expect(feedbackField.textContent).toBe(INPUT_FEEDBACK.INVALID_EMAIL);
  });

  it('should return true for valid email', () => {
    field.value = 'valid@email.com';
    const result = emailFeedback(field, feedbackField);
    expect(result).toBe(true);
    expect(field.classList.classes.has('is-invalid')).toBe(false);
    expect(feedbackField.textContent).toBe('');
  });
});

describe('passwordFeedback', () => {
  let field, repeatField, feedbackField, repeatFeedbackField;
  beforeEach(() => {
    field = createMockField();
    repeatField = createMockField();
    feedbackField = createMockFeedbackField();
    repeatFeedbackField = createMockFeedbackField();
  });

  it('should return false if passwords do not match', () => {
    field.value = 'password1';
    repeatField.value = 'password2';
    const result = passwordFeedback(field, repeatField, feedbackField, repeatFeedbackField);
    expect(result).toBe(false);
    expect(field.classList.classes.has('is-invalid')).toBe(true);
    expect(repeatField.classList.classes.has('is-invalid')).toBe(true);
    expect(feedbackField.textContent).toBe(INPUT_FEEDBACK.PASSWORDS_NOT_MATCH);
    expect(repeatFeedbackField.textContent).toBe(INPUT_FEEDBACK.PASSWORDS_NOT_MATCH);
  });

  it('should return false if password is too short', () => {
    field.value = 'p'.repeat(MIN_PASSWORD_LENGTH - 1);
    repeatField.value = 'p'.repeat(MIN_PASSWORD_LENGTH - 1);
    const result = passwordFeedback(field, repeatField, feedbackField, repeatFeedbackField);
    expect(result).toBe(false);
    expect(field.classList.classes.has('is-invalid')).toBe(true);
    expect(repeatField.classList.classes.has('is-invalid')).toBe(true);
    expect(feedbackField.textContent).toBe(INPUT_FEEDBACK.PASSWORD_TOO_SHORT);
    expect(repeatFeedbackField.textContent).toBe(INPUT_FEEDBACK.PASSWORD_TOO_SHORT);
  });

  it('should return true for valid passwords', () => {
    field.value = 'validPassword';
    repeatField.value = 'validPassword';
    const result = passwordFeedback(field, repeatField, feedbackField, repeatFeedbackField);
    expect(result).toBe(true);
    expect(field.classList.classes.has('is-invalid')).toBe(false);
    expect(repeatField.classList.classes.has('is-invalid')).toBe(false);
    expect(feedbackField.textContent).toBe('');
    expect(repeatFeedbackField.textContent).toBe('');
  });
});
