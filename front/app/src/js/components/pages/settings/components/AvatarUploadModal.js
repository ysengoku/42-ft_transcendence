import { Modal } from 'bootstrap';
import avatarPlaceholder from '/img/avatar-placeholder.svg?url';

export class AvatarUploadModal extends HTMLElement {
  #MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

  constructor() {
    super();
    this.modal = null;
    this.modalElement = null;
    this.selectedFile = null;
    this.onConfirm = null;
    this.currentBlobUrl = null;

    this.readURL = this.readURL.bind(this);
    this.handleConfirm = this.handleConfirm.bind(this);
    this.removeFeedback = this.removeFeedback.bind(this);
    this.handleCancel = this.handleCancel.bind(this);
    this.clearFocusInModal = this.clearFocusInModal.bind(this);
  }

  connectedCallback() {
    this.render();
  }

  disconnectedCallback() {
    this.avatarUploadField.removeEventListener('input', this.removeFeedback);
    this.cancelButton.removeEventListener('click', this.handleCancel);
    this.avatarUploadField.removeEventListener('change', this.readURL);
    this.confirmButton.removeEventListener('click', this.handleConfirm);
    if (this.modalElement) {
      this.clearFocusInModal();
    }
    this.modal?.hide();
    this.modalElement.removeEventListener('hide.bs.modal', this.clearFocusInModal);
  }

  render() {
    this.innerHTML = this.style() + this.template();
    this.modal = new Modal(this.querySelector('#avatar-upload-modal'));

    this.modalElement = this.querySelector('.modal');
    this.avatarUploadField = this.querySelector('#avatar-upload-input');
    this.avatarPreview = this.querySelector('#avatar-upload-preview');
    this.confirmButton = this.querySelector('#confirm-avatar-button');
    this.cancelButton = this.querySelector('#cancel-avatar-upload');

    this.modalElement.addEventListener('hide.bs.modal', this.clearFocusInModal);
    this.avatarPreview.src = avatarPlaceholder;
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
        if (!file.type.startsWith('image/')) {
          this.avatarUploadField.classList.add('is-invalid');
          this.querySelector('#avatar-feedback').textContent = 'Please select a valid image file.';
          this.selectedFile = null;
          return;
        }
        if (file.size > this.#MAX_FILE_SIZE) {
          this.avatarUploadField.classList.add('is-invalid');
          const maxSizeMB = this.#MAX_FILE_SIZE / (1024 * 1024);
          this.querySelector('#avatar-feedback').textContent =
            `Selected file is too large. Please choose one smaller than ${maxSizeMB}MB.`;
          this.selectedFile = null;
          return;
        }
        this.selectedFile = file;
        if (this.currentBlobUrl) {
          URL.revokeObjectURL(this.currentBlobUrl);
        }
        const blobUrl = URL.createObjectURL(file);
        this.currentBlobUrl = blobUrl;
        this.avatarPreview.src = blobUrl;
        this.modalElement.addEventListener(
          'hide.bs.modal',
          () => {
            if (this.currentBlobUrl) {
              URL.revokeObjectURL(this.currentBlobUrl);
              this.currentBlobUrl = null;
            }
          },
          { once: true },
        );
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

  clearFocusInModal() {
    if (this.modalElement.contains(document.activeElement)) {
      document.activeElement.blur();
    }
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
              <input class="form-control" type="file" id="avatar-upload-input" accept="image/jpeg, image/png, image/webp">
              <div class='invalid-feedback' id='avatar-feedback'></div>
            </div>
          </div>

          <div class="modal-footer">
            <button type="button" class="btn" data-bs-dismiss="modal" id="cancel-avatar-upload">Cancel</button>
            <button type="button" class="btn fw-bold" id="confirm-avatar-button">Confirm</button>
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
        width: 64%;
        max-width: 240px;
        margin: 0 auto;
        position: relative; 
      }
      .avatar-wrapper {
        width: 100%;
        aspect-ratio: 1 / 1;
        border-radius: 50%;
        overflow: hidden;
        position: relative;
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
