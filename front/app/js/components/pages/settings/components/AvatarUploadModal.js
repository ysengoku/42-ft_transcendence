export class AvatarUploadModal extends HTMLElement {
	constructor() {
		super();
		this.modal = null;
	}

	connectedCallback() {
		this.render();
	}

	render() {
		this.innerHTML = `
		<div class="modal fade" tabindex="-1" aria-labelledby="avatar-upload-modal-label" aria-hidden="true" id="avatar-upload-modal">
			<div class="modal-dialog modal-dialog-centered">
				<div class="modal-content">
					<div class="modal-header">
						<h5 class="modal-title" id="exampleModalLabel">Upload Avatar</h5>
					</div>
					<div class="modal-body">
						<p>Avatar upload modal body</p>
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

}

customElements.define('avatar-upload-modal', AvatarUploadModal);
