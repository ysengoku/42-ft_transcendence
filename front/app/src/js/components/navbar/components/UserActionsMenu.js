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
    this.setUserActionEventListeners();
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
          position: absolute;
          top: 100%;
          left: 0;
          max-height: 75vh;
          overflow: auto;
        }
	    </style>
      <div class="nav-link me-2" id="navbar-user-actions" role="button" data-bs-toggle="dropdown" aria-expanded="false">
        <div class="navbar-icon">
          <i class="bi bi-list"></i>
          <span class="badge">
		        <i class="bi bi-fire"></i>
          </span>
        </div>
      </div>

      <!-- User actions -->
      <div class="dropdown-menu p-3" aria-labelledby="navbar-user-actions" data-bs-auto-close="outside" id="dropdown-user-actions">
        <div class="dropdown-item mb-2" id="dropdown-item-user-search">Find user</div>
        <div class="dropdown-item mb-2" id="dropdown-item-friends-list">Friends list</div>
        <div class="dropdown-item" id="dropdown-item-chat">Chat</div>
      </div>

      <!-- User search -->
      <div class="dropdown-menu p-3" id="dropdown-user-search">
        <user-search></user-search>
      </div>

      <!-- Friends list -->
      <div class="dropdown-menu p-3" id="dropdown-friends-list">
        <friends-list></friends-list>
      </div>
    `;
  }

  setUserActionEventListeners() {
    const dropdownUserActions = document.getElementById('dropdown-user-actions');
    const dropdownUserSearch = document.getElementById('dropdown-user-search');
    const dropdownFriendsList = document.getElementById('dropdown-friends-list');

    /* Set user actions dropdown */
    const userActionsButton = document.getElementById('navbar-user-actions');
    userActionsButton.addEventListener('shown.bs.dropdown', () => {
      dropdownUserActions.classList.add('show');
      dropdownUserSearch.classList.remove('show');
      dropdownFriendsList.classList.remove('show');
    });
    userActionsButton.addEventListener('hidden.bs.dropdown', () => {
      dropdownUserActions.classList.remove('show');
      dropdownUserSearch.classList.remove('show');
      dropdownFriendsList.classList.remove('show');
    });

    /* Set user serach */
    const userSearchButton = document.getElementById('dropdown-item-user-search');
    userSearchButton.addEventListener('click', (event) => {
      event.stopPropagation();
      dropdownUserSearch.classList.add('show');
      dropdownFriendsList.classList.remove('show');
    });

    /* Set friends list */
    const friendsListButton = document.getElementById('dropdown-item-friends-list');
    friendsListButton.addEventListener('click', (event) => {
      event.stopPropagation();
      dropdownUserSearch.classList.remove('show');
      dropdownFriendsList.classList.add('show');

      const friendList = document.querySelector('friends-list');
      friendList.fetchFriendsData();
    });

    /* Set chat */
    const chatButton = document.getElementById('dropdown-item-chat');
    chatButton.addEventListener('click', () => {
      dropdownUserActions.classList.remove('show');
      dropdownUserSearch.classList.remove('show');
      dropdownFriendsList.classList.remove('show');
      router.navigate('/chat');
    });
  }
}

customElements.define('user-actions-menu', UserActionsMenu);
