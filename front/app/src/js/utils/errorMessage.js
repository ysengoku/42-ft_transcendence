export const ERROR_MESSAGES = {
  SERVER_ERROR: 'An unexpected error occurred. Please try again later.',
  SOMETHING_WENT_WRONG: 'Something went wrong. Please try again later.',
  SESSION_EXPIRED: 'Your session has expired. Please log in again.',
};

export function showErrorMessage(message) {
  const errorContainer = document.getElementById('error-message-container');
  if (errorContainer) {
    console.log('Error message:', message);
    errorContainer.innerHTML = '';
    const errorMessage = document.createElement('div');
    errorMessage.className = 'alert alert-danger alert-dismissible fade show';
    errorMessage.role = 'alert';
    errorMessage.innerHTML = `
      ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
      `;
    errorContainer.appendChild(errorMessage);
  }
}

export function removeAlert() {
  const errorContainer = document.getElementById('error-message-container');
  if (errorContainer) {
    errorContainer.innerHTML = '';
  }
}

export function addDissmissAlertListener() {
  document.addEventListener('click', removeAlert);
  window.addEventListener('popstate', removeAlert);
  window.addEventListener('pushstate', removeAlert);
}
