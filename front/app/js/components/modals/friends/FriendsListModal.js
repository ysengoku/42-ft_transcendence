export class FriendsListModal extends HTMLElement {
	constructor() {
		super();
		this.modal = null;
	}
	
	connectedCallback() {
		this.render();
	}

	render() {
		this.innerHTML = `
		<div class="modal fade friends-modal" id="friendsModal" tabindex="-1" aria-labelledby="friendsModalLabel" aria-hidden="true">
			<div class="modal-dialog modal-dialog-scrollable">
   				<div class="modal-content">
    				<div class="modal-header">
        				<h5 class="modal-title" id="friendsModalLabel">Friends</h5>
        				<button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
      				</div>
					<div class="modal-body">
						<ul class="list-group">
							<li class="list-group-item d-flex align-items-center">
								<img src="/assets/img/sample_avatar.jpg" alt="Avatar" class="rounded-circle me-3" style="width: 40px; height: 40px;">
								John
								<span class="status-indicator online ms-3"></span>
							</li>
							<li class="list-group-item d-flex align-items-center">
								<img src="/assets/img/sample_avatar.jpg" alt="Avatar" class="rounded-circle me-3" style="width: 40px; height: 40px;">
								Jane
								<span class="status-indicator ms-3"></span>
							</li>
							<li class="list-group-item d-flex align-items-center">
								<img src="/assets/img/sample_avatar.jpg" alt="Avatar" class="rounded-circle me-3" style="width: 40px; height: 40px;">
								George
								<span class="status-indicator online ms-3"></span>
							</li>
							<li class="list-group-item d-flex align-items-center">
								<img src="/assets/img/sample_avatar.jpg" alt="Avatar" class="rounded-circle me-3" style="width: 40px; height: 40px;">
								George
								<span class="status-indicator online ms-3"></span>
							</li>
							<li class="list-group-item d-flex align-items-center">
								<img src="/assets/img/sample_avatar.jpg" alt="Avatar" class="rounded-circle me-3" style="width: 40px; height: 40px;">
								George
								<span class="status-indicator online ms-3"></span>
							</li>
							<li class="list-group-item d-flex align-items-center">
								<img src="/assets/img/sample_avatar.jpg" alt="Avatar" class="rounded-circle me-3" style="width: 40px; height: 40px;">
								George
								<span class="status-indicator online ms-3"></span>
							</li>
						</ul>
					</div>
				</div>
			</div>
		</div>
		`;

		this.modal = new bootstrap.Modal(this.querySelector('#friendsModal'));
	}

	showModal() {
		if (this.modal) {
			this.modal.show();
		}
	}
}

customElements.define('friends-list-modal', FriendsListModal);
