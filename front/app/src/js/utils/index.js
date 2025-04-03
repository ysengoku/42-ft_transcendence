import { ThemeController } from './ThemeController';
import { isMobile } from './viewPort';
import { getRelativeTime, getRelativeDateAndTime } from './dateFormat';
import { sanitizeHtml } from './sanitizeHtml';
import { showFormErrorFeedback } from './formFeedback';
import { showToastNotification } from './toastnotification';

import {
  createClouds,
  createStars,
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
  getRelativeTime,
  getRelativeDateAndTime,
  sanitizeHtml,
  showFormErrorFeedback,
  showToastNotification,
  createClouds,
  createStars,
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
