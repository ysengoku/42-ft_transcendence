export class AvatarUploadModal extends HTMLElement {
	constructor() {
		super();
		this.modal = null;
	}

	connectedCallback() {
		this.render();
		this.setupPreview();
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
						<div class="mb-3">
							<img id="avatar-preview" src="" alt="" class="img-fluid rounded mx-auto d-block">
						</div>
						<div class="mb-3">
  							<label for="upload" class="form-label">Select file</label>
  							<input class="form-control" type="file" id="upload-input" accept="image/*" readonly>
						</div>
					</div>
					<div class="modal-footer">
        				<button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
        				<button type="button" class="btn btn-primary">Save changes</button>
      				</div>
				</div>
			</div>
		</div>
		`;
		this.modal = new bootstrap.Modal(this.querySelector('#avatar-upload-modal'));
	};

	showModal() {
		if (this.modal) {
			this.modal.show();
		}
	}

	setupPreview() {
		const uploadInput = this.querySelector('#upload-input');
		uploadInput.addEventListener('change', (event) => this.readURL(event));
	}

	readURL(event) {
		const input = event.target;
		const file = input.files[0];
		const preview = this.querySelector('#avatar-preview');

		if (file) {
			const reader = new FileReader();
			reader.onload = (e) => {
				preview.src = e.target.result;
			};
			reader.readAsDataURL(file);
		}
	}
}

customElements.define('avatar-upload-modal', AvatarUploadModal);
