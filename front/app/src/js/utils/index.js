import { ThemeController } from './ThemeController';
import { createClouds, createStars, loader, flyAway, fireWork, particleBurst } from './animations';
import { isMobile, BREAKPOINT } from './viewPort';
import { setupObserver } from './intersectionObserver';

import { getRelativeTime, getRelativeDateAndTime, formatDateMDY } from './dateFormat';
import { isEqual } from './isEqual';

import {
  INPUT_FEEDBACK,
  usernameFeedback,
  nicknameFeedback,
  emailFeedback,
  passwordFeedback,
  isFieldFilled,
  removeInputFeedback,
} from './inputFeedback';

import { showFormErrorFeedback } from './formFeedback';

import { showToastNotification, TOAST_TYPES, sessionExpiredToast, unknownErrorToast } from './toastnotification';

import {
  ALERT_TYPE,
  showAlertMessage,
  showAlertMessageForDuration,
  removeAlert,
  addDismissAlertListener,
  internalServerErrorAlert,
} from './alertMessage';

export {
  ThemeController,
  createClouds,
  createStars,
  loader,
  flyAway,
  fireWork,
  particleBurst,
  isMobile,
  setupObserver,
  BREAKPOINT,
  getRelativeTime,
  getRelativeDateAndTime,
  formatDateMDY,
  isEqual,
  INPUT_FEEDBACK,
  usernameFeedback,
  nicknameFeedback,
  emailFeedback,
  passwordFeedback,
  isFieldFilled,
  removeInputFeedback,
  showFormErrorFeedback,
  showToastNotification,
  TOAST_TYPES,
  sessionExpiredToast,
  unknownErrorToast,
  ALERT_TYPE,
  showAlertMessage,
  showAlertMessageForDuration,
  removeAlert,
  addDismissAlertListener,
  internalServerErrorAlert,
};
