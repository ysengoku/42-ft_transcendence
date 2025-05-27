import { Toast } from 'bootstrap';

export const TOAST_TYPES = {
  info: 'info',
  error: 'error',
}

export function showToastNotification(message, type = TOAST_TYPES.info) {
  const toastContainer = document.getElementById('toast-notification');
  if (!toastContainer) {
    return;
  }
  toastContainer.innerHTML = `
    <style>
    .toast-container {
      top: 56px;
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
  if (type === TOAST_TYPES.error) {
    toast.style.backgroundColor = 'var(--pm-red-500)';
  } else {
    toast.style.backgroundColor = 'var(--pm-primary-500)';
  }
  const toastBootstrap = Toast.getOrCreateInstance(toast);
  toastBootstrap.show();
}
