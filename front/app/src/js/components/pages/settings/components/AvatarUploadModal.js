import avatarPlaceholder from '/img/avatar-placeholder.svg?url';

export class AvatarUploadModal extends HTMLElement {
  constructor() {
    super();
    this.modal = null;
    this.selectedFile = null;
    this.onConfirm = null;
  }

  connectedCallback() {
    this.render();
    this.setupPreview();
    this.setupConfirmHandler();
  }

  render() {
    this.innerHTML = `
		<div class="modal fade" tabindex="-1" aria-labelledby="avatar-upload-modal-label" aria-hidden="true" id="avatar-upload-modal">
			<div class="modal-dialog modal-dialog-centered">
				<div class="modal-content">
					<div class="modal-header">
						<h5 class="modal-title">Upload Avatar</h5>
					</div>
					<div class="modal-body">
        				<div class="avatar-preview-container">
         					<div class="avatar-wrapper">
            					<img id="avatar-upload-preview" src="${avatarPlaceholder}" alt="Avatar Preview" class="avatar-preview">
        					</div>
        				</div>
						<div class="mb-3">
  							<label for="avatar-upload-input" class="form-label">Select file</label>
  							<input class="form-control" type="file" id="avatar-upload-input" accept="image/*" readonly>
							<div class='invalid-feedback' id='avatar-feedback'></div>
						</div>
					</div>
					<div class="modal-footer">
        				<button type="button" class="btn btn-secondary" data-bs-dismiss="modal" id="cancel-avatar-upload">Close</button>
        				<button type="button" class="btn btn-primary" id="confirm-avatar-button">Confirm</button>
      				</div>
				</div>
			</div>
		</div>
		`;
    this.modal = new bootstrap.Modal(this.querySelector('#avatar-upload-modal'));
  }

  showModal(onConfirmCallback) {
    this.onConfirm = onConfirmCallback;
    if (this.modal) {
      this.modal.show();
    }
  }

  setupPreview() {
    const uploadInput = this.querySelector('#avatar-upload-input');
    uploadInput.addEventListener('click', () => {
      uploadInput.classList.remove('is-invalid');
      document.querySelector('#avatar-feedback').textContent = '';
    });
    const cancelButton = this.querySelector('#cancel-avatar-upload');
    cancelButton.addEventListener('click', () => {
      uploadInput.classList.remove('is-invalid');
      uploadInput.value = '';
      this.selectedFile = null;
      this.querySelector('#avatar-upload-preview').src = '/assets/img/avatar-placeholder.svg';
    });
    uploadInput.addEventListener('change', (event) => this.readURL(event));
  }

  readURL(event) {
    const preview = this.querySelector('#avatar-upload-preview');
    const input = event.target;

    if (input && input.files && input.files.length > 0) {
      const file = input.files[0];
      if (file) {
        this.selectedFile = file;
        const reader = new FileReader();
        reader.onload = (e) => {
          preview.src = e.target.result;
        };
        reader.readAsDataURL(file);
      }
    }
  }

  setupConfirmHandler() {
    const confirmButton = this.querySelector('#confirm-avatar-button');
    confirmButton.addEventListener('click', () => this.handleConfirm());
  }

  handleConfirm() {
    if (!this.selectedFile) {
      const avatarField = this.querySelector('#avatar-upload-input');
      avatarField.classList.add('is-invalid');
      this.querySelector('#avatar-feedback').textContent = 'No file is selected.';
      return;
    }
    if (this.onConfirm) {
      this.onConfirm(this.selectedFile);
    }
    this.modal.hide();
  }
}

customElements.define('avatar-upload-modal', AvatarUploadModal);
