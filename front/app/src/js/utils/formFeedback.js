export function showFormErrorFeedback(field, message) {
  const feedback = document.createElement('div');
  const dismissButton = document.createElement('button');
	
  field.innerHTML = '';

  feedback.classList.add('alert', 'alert-danger', 'alert-dismissible');
  feedback.setAttribute('role', 'alert');
  feedback.textContent = message;

  dismissButton.classList.add('btn-close');
  dismissButton.setAttribute('data-bs-dismiss', 'alert');
  dismissButton.setAttribute('aria-label', 'Close');

  feedback.appendChild(dismissButton);
  field.appendChild(feedback);
}
