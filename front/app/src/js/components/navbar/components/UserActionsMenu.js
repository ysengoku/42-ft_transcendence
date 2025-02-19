import { router } from '@router';
import { auth } from '@auth';
import { isMobile } from '@utils';

export class UserActionsMenu extends HTMLElement {
  constructor() {
    super();
    this.isLoggedin = false;
  }

  connectedCallback() {
    this.isLoggedin = auth.getStoredUser() ? true : false;
    if (!isMobile() || !this.isLoggedin) {
      return;
    }
    this.render();
  }

  render() {
    this.innerHTML = `
      <style>
        #navbar-user-actions {
        }
        #navbar-user-actions i {
         font-size: 40px
        }
		    .navbar-icon {
          position: relative;
		      display: inline-block;
        }
        .badge {
          position: absolute;
          top: 8px;
          right: -8px;
          color: red;
        }
        .badge i {
          font-size: 20px !important;
        }
        .dropdown-menu {
          max-height: 75vh;
          overflow: auto;
        }
	    </style>
      <div class="nav-link me-2" id="navbar-user-actions" role="button" data-bs-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
        <div class="navbar-icon">
          <i class="bi bi-list"></i>
          <span class="badge">
		        <i class="bi bi-fire"></i>
          </span>
        </div>
      </div>
	    <div class="dropdown-menu p-3" aria-labelledby="navbar-user-actions" data-bs-auto-close="outside">
	    </div>
    `;

    const userActionsButton = document.getElementById('navbar-user-actions');
    userActionsButton.addEventListener('shown.bs.dropdown', () => {
      this.renderUserActions();
    });
    userActionsButton.addEventListener('hidden.bs.dropdown', () => {
      const dropdown = document.querySelector('.dropdown-menu');
      dropdown.innerHTML = '';
      // TODO: Remove all event listeners
    });
  }

  renderUserActions() {
    const userActions = this.querySelector('.dropdown-menu');
    userActions.innerHTML = `
    	<div class="dropdown-item mb-2" id="dropdown-item-user-search">Find user</div>
		  <div class="dropdown-item mb-2" id="dropdown-item-friends-list">Friends list</div>
		  <div class="dropdown-item" id="dropdown-item-chat">Chat</div>
    `;

    this.setUserSearchButton();
    this.setFriendsListButton();

    const chatButton = document.getElementById('dropdown-item-chat');
    chatButton.addEventListener('click', () => {
      router.navigate('/chat');
    });
  }

  setUserSearchButton() {
    const userSearchButton = document.getElementById('dropdown-item-user-search');
    userSearchButton.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      const dropdown = document.querySelector('.dropdown-menu');
      dropdown.innerHTML = '';
      const userSearch = document.createElement('user-search');
      dropdown.appendChild(userSearch);
    });
  }

  setFriendsListButton() {
    const friendsListButton = document.getElementById('dropdown-item-friends-list');
    friendsListButton.addEventListener('click', (event) => {
      // event.preventDefault();
      event.stopPropagation();
      const dropdown = document.querySelector('.dropdown-menu');
      dropdown.innerHTML = '';
      const friendsList = document.createElement('friends-list');
      dropdown.appendChild(friendsList);
      const customEvent = new CustomEvent('clickOnFriendsList', { bubbles: true });
      document.dispatchEvent(customEvent);
    });
  }
}

customElements.define('user-actions-menu', UserActionsMenu);
