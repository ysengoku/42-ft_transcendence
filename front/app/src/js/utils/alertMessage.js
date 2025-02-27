export const ALERT_MESSAGES = {
  SERVER_ERROR: 'An unexpected error occurred. Please wait or try again later.',
  UNKNOWN_ERROR: 'Something went wrong. Please try again later.',
  SESSION_EXPIRED: 'Your session has expired. Please log in again.',
};

/**
 * Alert types based on Bootstrap alert classes.
 */
export const ALERT_TYPE = {
  SUCCESS: 'alert-success',
  ERROR: 'alert-danger',
  LIGHT: 'alert-light',
};

/**
 * Displays an alert message in the specified container.
 * @param {string} type - The type of alert (e.g., 'alert-success', 'alert-danger', 'alert-light').
 * @param {string} message - The message to display in the alert.
 */
export function showAlertMessage(type, message) {
  const alertContainer = document.getElementById('error-message-container');
  if (alertContainer) {
    alertContainer.innerHTML = '';
    const alertMessage = document.createElement('div');
    alertMessage.className = `alert ${type} alert-dismissible fade show`;
    alertMessage.role = 'alert';

    const alertContent = document.createElement('div');
    alertContent.textContent = message;

    const dismissButton = document.createElement('button');
    dismissButton.type = 'button';
    dismissButton.className = 'btn-close';
    dismissButton.setAttribute('data-bs-dismiss', 'alert');
    dismissButton.setAttribute('aria-label', 'close');

    alertMessage.appendChild(alertContent);
    alertMessage.appendChild(dismissButton);
    alertContainer.appendChild(alertMessage);
  }
}

/**
 * Displays an alert message for a specified duration.
 * @param {string} type - The type of alert (e.g., 'alert-success', 'alert-danger', 'alert-light').
 * @param {string} message - The message to display in the alert.
 * @param {number} duration - The duration (in milliseconds) to display the alert.
 */
export function showAlertMessageForDuration(type, message, duration) {
  showAlertMessage(type, message);
  setTimeout(() => {
    removeAlert();
  }, duration);
}

/**
 * Removes the alert message from the specified container.
 */
export function removeAlert() {
  const alertContainer = document.getElementById('error-message-container');
  if (alertContainer) {
    alertContainer.innerHTML = '';
  }
}

/**
 * Adds event listeners to dismiss the alert message on certain events.
 */
export function addDissmissAlertListener() {
  document.addEventListener('click', removeAlert);
  window.addEventListener('popstate', removeAlert);
  window.addEventListener('pushstate', removeAlert);
}
