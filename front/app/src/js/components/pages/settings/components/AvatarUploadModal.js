import avatarPlaceholder from '/img/avatar-placeholder.svg?url';

export class AvatarUploadModal extends HTMLElement {
  constructor() {
    super();
    this.modal = null;
    this.selectedFile = null;
    this.onConfirm = null;
    this.readURL = this.readURL.bind(this);
    this.handleConfirm = this.handleConfirm.bind(this);
    this.removeFeedback = this.removeFeedback.bind(this);
    this.handleCancel = this.handleCancel.bind(this);
  }

  connectedCallback() {
    this.render();
  }

  disconnectedCallback() {
    this.avatarUploadField.removeEventListener('input', this.removeFeedback);
    this.cancelButton.removeEventListener('click', this.handleCancel);
    this.avatarUploadField.removeEventListener('change', this.readURL);
    this.confirmButton.removeEventListener('click', this.handleConfirm);
  }

  render() {
    this.innerHTML = this.style() + this.template();
    this.modal = new bootstrap.Modal(this.querySelector('#avatar-upload-modal'));

    this.avatarUploadField = this.querySelector('#avatar-upload-input');
    this.avatarPreview = this.querySelector('#avatar-upload-preview');
    this.confirmButton = this.querySelector('#confirm-avatar-button');
    this.cancelButton = this.querySelector('#cancel-avatar-upload');

    this.avatarUploadField.addEventListener('input', this.removeFeedback);
    this.cancelButton.addEventListener('click', this.handleCancel);
    this.avatarUploadField.addEventListener('change', this.readURL);
    this.confirmButton.addEventListener('click', this.handleConfirm);
  }

  showModal(onConfirmCallback) {
    this.onConfirm = onConfirmCallback;
    if (this.modal) {
      this.modal.show();
    }
  }

  removeFeedback() {
    this.avatarUploadField.classList.remove('is-invalid');
    document.querySelector('#avatar-feedback').textContent = '';
  }

  handleCancel() {
    this.avatarUploadField.classList.remove('is-invalid');
    this.avatarUploadField.value = '';
    this.selectedFile = null;
    this.avatarPreview.src = avatarPlaceholder;
  }

  readURL(event) {
    const input = event.target;

    if (input && input.files && input.files.length > 0) {
      const file = input.files[0];
      if (file) {
        this.selectedFile = file;
        const reader = new FileReader();
        reader.onload = (e) => {
          this.avatarPreview.src = e.target.result;
        };
        reader.readAsDataURL(file);
      }
    }
  }

  handleConfirm() {
    if (!this.selectedFile) {
      this.avatarUploadField.classList.add('is-invalid');
      this.querySelector('#avatar-feedback').textContent = 'No file is selected.';
      return;
    }
    if (this.onConfirm) {
      this.onConfirm(this.selectedFile);
    }
    this.modal.hide();
  }

  template() {
    return `
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
  					  <input class="form-control" type="file" id="avatar-upload-input" accept="image/jpeg, image/png, image/webp" readonly>
						  <div class='invalid-feedback' id='avatar-feedback'></div>
						</div>
					</div>

					<div class="modal-footer">
        		<button type="button" class="btn" data-bs-dismiss="modal" id="cancel-avatar-upload">Cancel</button>
        		<button type="button" class="btn btn-wood" id="confirm-avatar-button">Confirm</button>
      		</div>
				</div>
			</div>
		</div>
		`;
  }

  style() {
    return `
    <style>
      .avatar-preview-container {
        width: 70%;
        max-width: 300px;
        margin: 0 auto;
        position: relative; 
      }
      .avatar-wrapper {
        width: 100%;
        aspect-ratio: 1 / 1;
        border-radius: 50%;
        overflow: hidden;
        position: relative;
        /* background: rgba(255, 255, 255, 0.5); */
      }
      .avatar-preview {
        width: 100%;
        height: 100%;
        object-fit: cover;
        object-position: center;
      }
    </style>
    `;
  }
}

customElements.define('avatar-upload-modal', AvatarUploadModal);
