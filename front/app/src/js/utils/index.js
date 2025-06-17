import { ThemeController } from './ThemeController';
import { createClouds, createStars, loader, flyAway } from './animations';
import { isMobile, BREAKPOINT } from './viewPort';

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

import { showToastNotification, TOAST_TYPES, sessionExpiredToast, unknowknErrorToast } from './toastnotification';

import {
  ALERT_TYPE,
  showAlertMessage,
  showAlertMessageForDuration,
  showTournamentAlert,
  TOURNAMENT_ALERT_TYPE,
  removeAlert,
  addDissmissAlertListener,
  internalServerErrorAlert,
} from './alertMessage';

import { sanitizeHtml } from './sanitizeHtml';

export {
  ThemeController,
  createClouds,
  createStars,
  loader,
  flyAway,
  isMobile,
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
  unknowknErrorToast,
  ALERT_TYPE,
  showAlertMessage,
  showAlertMessageForDuration,
  showTournamentAlert,
  TOURNAMENT_ALERT_TYPE,
  removeAlert,
  addDissmissAlertListener,
  internalServerErrorAlert,
  sanitizeHtml,
};
