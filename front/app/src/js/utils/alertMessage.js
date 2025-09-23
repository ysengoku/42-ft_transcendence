/**
 * Alert types based on Bootstrap alert classes.
 */
export const ALERT_TYPE = {
  SUCCESS: 'alert-success',
  ERROR: 'alert-danger',
  LIGHT: 'alert-light',
};

const HEADER = {
  'alert-success': 'Mighty fine!',
  'alert-danger': 'Oops!',
  'alert-light': '',
};

const ICON = {
  'alert-success': 'bi-hand-thumbs-up',
  'alert-danger': 'bi-x-octagon',
  'alert-light': 'bi-exclamation-octagon',
  'alert-tournament': 'bi-fire',
};

/**
 * Displays an alert message in the specified container.
 * @param {string} type - The type of alert (e.g., 'alert-success', 'alert-danger', 'alert-light').
 * @param {string} message - The message to display in the alert.
 */
export function showAlertMessage(type, message) {
  const alertContainer = document.getElementById('alert-message-container');
  if (alertContainer) {
    alertContainer.innerHTML = '';
    const alertMessage = document.createElement('div');

    alertMessage.innerHTML = alertContentTemplate(type);
    const iconElement = alertMessage.querySelector('#alert-icon');
    const headerElement = alertMessage.querySelector('#alert-header');
    const messageElement = alertMessage.querySelector('#alert-message');
    iconElement.classList.add(ICON[type]);
    headerElement.textContent = HEADER[type];
    messageElement.textContent = message;
    alertContainer.appendChild(alertMessage);
  }
}

/**
 * Displays an alert message for a specified duration.
 * @param {string} type - The type of alert (e.g., 'alert-success', 'alert-danger', 'alert-light').
 * @param {string} message - The message to display in the alert.
 * @param {number} duration - The duration (in milliseconds) to display the alert.
 */
export function showAlertMessageForDuration(type, message, duration = 3000) {
  showAlertMessage(type, message);
  setTimeout(() => {
    removeAlert();
  }, duration);
}

/**
 * Removes the alert message from the specified container.
 */
export function removeAlert() {
  const alertContainer = document.getElementById('alert-message-container');
  if (alertContainer) {
    alertContainer.innerHTML = '';
  }
}

/**
 * Adds event listeners to dismiss the alert message on certain events.
 */
export function addDismissAlertListener() {
  document.addEventListener('click', removeAlert);
  window.addEventListener('popstate', removeAlert);
  window.addEventListener('pushstate', removeAlert);
}

export function internalServerErrorAlert() {
  const message = 'An unexpected error occurred. Please wait or try again later.';
  showAlertMessageForDuration(ALERT_TYPE.ERROR, message, 5000);
}

function alertContentTemplate(type) {
  return `
    <div class="alert ${type} alert-dismissible fade show mt-2" role="alert">
      <div class="d-flex flex-column align-items-center ms-5 p-3">
        <i id="alert-icon" class="bi mb-2" style="font-size: 3rem"></i>
        <div id="alert-header" class="fs-4 fw-bold mb-2"></div>
        <div id="alert-message" class="text-center"></div>
      </div>
      <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    </div>
  `;
}
