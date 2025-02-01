import { simulateFetchFriendsList } from '@mock/functions/simulateFetchFriendsList.js';

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
    this.renderFriendsList();
    const mainView = document.getElementById('content');
    mainView.addEventListener('click', () => {
      const modal = document.querySelector('#friendsModal');
      modal.setAttribute('data-bs-dismiss', 'modal');
    });
  }

  renderFriendsList() {
    const listContainer = this.querySelector('#friends-list');
    listContainer.innerHTML = '';
    this.friendsList.forEach((friend) => {
      // console.log(`Rendering friend:`, friend);
      const listItem = document.createElement('friends-list-item');
      listItem.setAttribute('username', friend.username);
      listItem.setAttribute('avatar', friend.avatar);
      listItem.setAttribute('online', friend.online);
      listContainer.appendChild(listItem);
    });
  }

  render() {
    this.innerHTML = `
    <style>
      .friends-modal .modal-dialog {
      position: fixed;
      top: var(--navbar-height, 72px);
      right: 0;
      height: calc(100vh - var(--navbar-height, 72px));
      margin: 0;
      border-radius: 0;
    }
    </style>
		<div class="modal fade friends-modal" id="friendsModal" tabindex="-1" aria-hidden="true">
			<div class="modal-dialog modal-dialog-scrollable">
   			<div class="modal-content">
          <div class="modal-header d-flex flex-column align-items-start">
    				<div class="d-flex justify-content-between w-100">
        			<h5 class="modal-title">Friends</h5>
        			<button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="ps-2 pe-3 pt-3">
              <friend-search-bar></friend-search-bar>
      			</div>
          </div>
					<div class="modal-body">
						<ul class="list-group" id="friends-list"></ul>
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
    this.renderSearchBar();
  }

  renderSearchBar() {
    const friendSearchBar = this.querySelector('friend-search-bar');
    if (friendSearchBar) {
      friendSearchBar.render(); // もしrenderが必要なら
    }
  }
}

customElements.define('friends-list-modal', FriendsListModal);
