import { ThemeController } from './ThemeController';
import { isMobile } from './viewPort';
import { showFormErrorFeedback } from './formFeedback';

import {
  INPUT_FEEDBACK,
  passwordFeedback,
  isFieldFilled,
  removeInputFeedback,
} from './inputFeedback';

import {
  ALERT_TYPE,
  ALERT_MESSAGES,
  showAlertMessage,
  showAlertMessageForDuration,
  removeAlert,
  addDissmissAlertListener,
} from './alertMessage';


export {
  ThemeController,
  isMobile,
  showFormErrorFeedback,
  INPUT_FEEDBACK,
  passwordFeedback,
  isFieldFilled,
  removeInputFeedback,
  ALERT_MESSAGES,
  ALERT_TYPE,
  showAlertMessage,
  showAlertMessageForDuration,
  removeAlert,
  addDissmissAlertListener,
};
