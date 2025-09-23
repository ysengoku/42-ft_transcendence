import { Toast } from 'bootstrap';

export const TOAST_TYPES = {
  INFO: 'info',
  NOTIFICATION: 'notif',
  WARNING: 'warn',
  ERROR: 'error',
};

export function showToastNotification(message, type = TOAST_TYPES.INFO) {
  const toastContainer = document.getElementById('toast-notification');
  if (!toastContainer) {
    return;
  }
  toastContainer.innerHTML = `
    <style>
    .toast-container {
      top: 56px;
    }
    .toast {
      background-color: transparent;
    }
    .toast-body-wrapper {
      background-color: var(--pm-primary-500);
      border: none;
      border-radius: 0.5rem;
      color: var(--pm-gray-100);
    }
    </style>
    <div class="toast-container position-fixed end-0 p-3">
      <div class="toast align-items-center border-0" role="alert" aria-live="assertive" aria-atomic="true">
	    <div class="toast-body-wrapper d-flex">
        <div class="toast-body ps-4"></div>
		    <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
  	  </div>
    </div>`;

  const toastBody = document.querySelector('.toast-body');
  toastBody.textContent = message;

  const toast = document.querySelector('.toast');
  const toastBodyWrapper = document.querySelector('.toast-body-wrapper');
  const notificationDropdown = document.getElementById('notifications-dropdown');
  const notificationList = document.querySelector('notifications-list');

  switch (type) {
    case TOAST_TYPES.NOTIFICATION:
      toastBodyWrapper.style.backgroundColor = 'var(--pm-bg-success)';
      toastContainer.onclick = null;
      toastContainer.onclick = () => {
        if (notificationList) {
          notificationList.renderListContent();
        }
        if (notificationDropdown) {
          notificationDropdown.classList.add('show');
          notificationDropdown.setAttribute('data-bs-popper', 'static');
        }
        toastBootstrap?.dispose();
      };
      break;
    case TOAST_TYPES.INFO:
      toastBodyWrapper.style.backgroundColor = 'var(--pm-bg-success)';
      toastContainer.onclick = null;
      break;
    case TOAST_TYPES.ERROR:
      toastBodyWrapper.style.backgroundColor = 'var(--pm-bg-danger)';
      toastContainer.onclick = null;
      break;
    case TOAST_TYPES.WARNING:
      toastBodyWrapper.style.backgroundColor = 'var(--pm-gray-500)';
      toastContainer.onclick = null;
      break;
    default:
      break;
  }
  const toastBootstrap = Toast.getOrCreateInstance(toast);
  toastBootstrap.show();
  if (notificationDropdown) {
    notificationList?.resetList();
    notificationDropdown.classList.remove('show');
  }
}

export function sessionExpiredToast() {
  const message = 'Your session has expired. Please log in again.';
  showToastNotification(message, TOAST_TYPES.WARNING);
}

export function unknownErrorToast(errorMessage = null) {
  const message = errorMessage ? errorMessage : 'An unexpected error occurred. Please try again later.';
  showToastNotification(message, TOAST_TYPES.ERROR);
}
