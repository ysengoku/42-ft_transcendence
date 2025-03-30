export function showToastNotification(message) {
  const toastContainer = document.getElementById('toast-notification');
  if (!toastContainer) {
    return;
  }
  toastContainer.innerHTML = `
    <div class="toast-container position-fixed bottom-0 end-0 p-3">
      <div class="toast align-items-center border-0" role="alert" aria-live="assertive" aria-atomic="true">
	    <div class="d-flex">
          <div class="toast-body ps-2"></div>
		  <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
  	  </div>
    </div>`;

  const toastBody = document.querySelector('.toast-body');
  toastBody.textContent = message;
  const toast = document.querySelector('.toast');
  const toastBootstrap = bootstrap.Toast.getOrCreateInstance(toast);
  toastBootstrap.show();
}
