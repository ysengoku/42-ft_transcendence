import { ThemeController } from './ThemeController';
import { isMobile, BREAKPOINT } from './viewPort';
import { sanitizeHtml } from './sanitizeHtml';
import { showFormErrorFeedback } from './formFeedback';
import { showToastNotification } from './toastnotification';

import {
  getRelativeTime,
  getRelativeDateAndTime,
  formatDateMDY,
} from './dateFormat';

import {
  createClouds,
  createStars,
  loader,
} from './animations';

import {
  INPUT_FEEDBACK,
  emailFeedback,
  passwordFeedback,
  isFieldFilled,
  removeInputFeedback,
} from './inputFeedback';

import {
  ALERT_TYPE,
  ERROR_MESSAGES,
  showAlertMessage,
  showAlertMessageForDuration,
  removeAlert,
  addDissmissAlertListener,
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
  createClouds,
  createStars,
  loader,
  INPUT_FEEDBACK,
  emailFeedback,
  passwordFeedback,
  isFieldFilled,
  removeInputFeedback,
  ERROR_MESSAGES,
  ALERT_TYPE,
  showAlertMessage,
  showAlertMessageForDuration,
  removeAlert,
  addDissmissAlertListener,
};
