import { ThemeController } from './ThemeController';
import { isMobile, BREAKPOINT } from './viewPort';
import { sanitizeHtml } from './sanitizeHtml';
import { showFormErrorFeedback } from './formFeedback';
import { showToastNotification, TOAST_TYPES, sessionExpiredToast, unknowknErrorToast } from './toastnotification';

import { getRelativeTime, getRelativeDateAndTime, formatDateMDY } from './dateFormat';

import { createClouds, createStars, loader, flyAway } from './animations';

import { INPUT_FEEDBACK, emailFeedback, passwordFeedback, isFieldFilled, removeInputFeedback } from './inputFeedback';

import {
  ALERT_TYPE,
  showAlertMessage,
  showAlertMessageForDuration,
  removeAlert,
  addDissmissAlertListener,
  internalServerErrorAlert,
} from './alertMessage';

export {
  ThemeController,
  isMobile,
  BREAKPOINT,
  getRelativeTime,
  getRelativeDateAndTime,
  formatDateMDY,
  sanitizeHtml,
  showFormErrorFeedback,
  showToastNotification,
  TOAST_TYPES,
  sessionExpiredToast,
  unknowknErrorToast,
  createClouds,
  createStars,
  loader,
  flyAway,
  INPUT_FEEDBACK,
  emailFeedback,
  passwordFeedback,
  isFieldFilled,
  removeInputFeedback,
  ALERT_TYPE,
  showAlertMessage,
  showAlertMessageForDuration,
  removeAlert,
  addDissmissAlertListener,
  internalServerErrorAlert,
};
