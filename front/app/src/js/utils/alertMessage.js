// export const ERROR_MESSAGES = {
//   SERVER_ERROR: 'An unexpected error occurred. Please wait or try again later.',
//   UNKNOWN_ERROR: 'Something went wrong. Please try again later.',
//   SESSION_EXPIRED: 'Your session has expired. Please log in again.',
// };

export const ALERT_TYPE = {
  SUCCESS: 'alert-success',
  ERROR: 'alert-danger',
};

export function showAlertMessage(type, message) {
  const alertContainer = document.getElementById('error-message-container');
  if (alertContainer) {
    alertContainer.innerHTML = '';
    const alertMessage = document.createElement('div');
    alertMessage.className = `alert ${type} alert-dismissible fade show`;
    alertMessage.role = 'alert';
    alertMessage.innerHTML = `
      ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
      `;
    alertContainer.appendChild(alertMessage);
  }
}

export function showAlertMessageForDuration(type, message, duration) {
  showAlertMessage(type, message);
  setTimeout(() => {
    removeAlert();
  }, duration);
}

export function removeAlert() {
  const alertContainer = document.getElementById('error-message-container');
  if (alertContainer) {
    alertContainer.innerHTML = '';
  }
}

export function addDissmissAlertListener() {
  document.addEventListener('click', removeAlert);
  window.addEventListener('popstate', removeAlert);
  window.addEventListener('pushstate', removeAlert);
}
