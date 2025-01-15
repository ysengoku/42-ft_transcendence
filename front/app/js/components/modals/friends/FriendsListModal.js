import { simulateFetchFriendsList } from '../../../mock/simulateFetchFriendsList.js';

export class FriendsListModal extends HTMLElement {
	constructor() {
		super();
		this.modal = null;
		this.friendsList = [];
	}
	
	connectedCallback() {
		this.render();
		this.fetchFriendsData();
	}

	// Simulation with mock
	async fetchFriendsData() {
		this.friendsList = await simulateFetchFriendsList();
		// console.log(JSON.stringify(this.friendsList, null, 2));
		this.renderFriendsList()
	}

	renderFriendsList() {
		const listContainer = this.querySelector('.friends-list');
		listContainer.innerHTML = '';
		this.friendsList.forEach(friend => {
			console.log(`Rendering friend:`, friend);
			const listItem = document.createElement('friends-list-item');
			listItem.setAttribute('userid', friend.userid);
			listItem.setAttribute('name', friend.name);
			listItem.setAttribute('avatar', friend.avatar);
			listItem.setAttribute('online', friend.online);
			listContainer.appendChild(listItem);
		});
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
						<ul class="list-group friends-list"></ul>
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
