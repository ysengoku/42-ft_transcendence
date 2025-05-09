import { router } from '@router';
import { auth } from '@auth';
import { isMobile } from '@utils';

export class UserActionsMenu extends HTMLElement {
  #state = {
    isLoggedin: false,
  };

  constructor() {
    super();
    this.showUserActionsDropdown = this.showUserActionsDropdown.bind(this);
    this.hideUserActionsDropdown = this.hideUserActionsDropdown.bind(this);
    this.handleClickUserSearch = this.handleClickUserSearch.bind(this);
    this.handleClickFriendsList = this.handleClickFriendsList.bind(this);
    this.handleClickChat = this.handleClickChat.bind(this);
  }

  connectedCallback() {
    this.#state.isLoggedin = auth.getStoredUser() ? true : false;
    if (!isMobile() || !this.#state.isLoggedin) {
      return;
    }
    this.render();
  }

  disconnectedCallback() {
    this.userActionsButton?.removeEventListener('shown.bs.dropdown', this.showUserActionsDropdown);
    this.userActionsButton?.removeEventListener('hidden.bs.dropdown', this.hideUserActionsDropdown);
    this.userSearchButton?.removeEventListener('click', this.handleClickUserSearch);
    this.friendsListButton?.removeEventListener('click', this.handleClickFriendsList);
    this.chatButton?.removeEventListener('click', this.handleClickChat);
  }

  render() {
    this.innerHTML = this.template() + this.style();

    this.dropdownUserActions = document.getElementById('dropdown-user-actions');
    this.dropdownUserSearch = document.getElementById('dropdown-user-search');
    this.dropdownFriendsList = document.getElementById('dropdown-friends-list');
    this.dropdownusersearchList = document.querySelector('user-search');

    this.userActionsButton = document.getElementById('navbar-user-actions');
    this.userSearchButton = document.getElementById('dropdown-item-user-search');
    this.friendsListButton = document.getElementById('dropdown-item-friends-list');
    this.chatButton = document.getElementById('dropdown-item-chat');

    this.userActionsButton.addEventListener('shown.bs.dropdown', this.showUserActionsDropdown);
    this.userActionsButton.addEventListener('hidden.bs.dropdown', this.hideUserActionsDropdown);

    this.userSearchButton.addEventListener('click', this.handleClickUserSearch);
    this.friendsListButton.addEventListener('click', this.handleClickFriendsList);
    this.chatButton.addEventListener('click', this.handleClickChat);
  }

  showUserActionsDropdown() {
    this.dropdownUserActions.classList.add('show');
    this.dropdownUserSearch.classList.remove('show');
    this.dropdownFriendsList.classList.remove('show');
  }

  hideUserActionsDropdown() {
    this.dropdownUserActions.classList.remove('show');
    this.dropdownUserSearch.classList.remove('show');
    this.dropdownFriendsList.classList.remove('show');
    this.dropdownusersearchList.clearUserList();
  }

  handleClickUserSearch(event) {
    event.stopPropagation();
    this.dropdownUserActions.classList.remove('show');
    this.dropdownUserSearch.classList.add('show');
    this.dropdownFriendsList.classList.remove('show');
  }

  async handleClickFriendsList(event) {
    event.stopPropagation();
    this.dropdownUserActions.classList.remove('show');
    this.dropdownUserSearch.classList.remove('show');
    this.dropdownFriendsList.classList.add('show');

    const friendList = document.querySelector('friends-list');
    await friendList.fetchFriendsData();
  }

  handleClickChat() {
    this.dropdownUserActions.classList.remove('show');
    this.dropdownUserSearch.classList.remove('show');
    this.dropdownFriendsList.classList.remove('show');
    router.navigate('/chat');
  }

  template() {
    return `
    <div class="nav-link me-2" id="navbar-user-actions" role="button" data-bs-toggle="dropdown" aria-expanded="false">
      <div class="navbar-icon d-inline-block">
        <i class="bi bi-list"></i>
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

  style() {
    return `
    <style>
      #navbar-user-actions i {
        font-size: 40px
      }
      .dropdown-menu {
        position: absolute;
        top: 100%;
        left: 0;
        max-height: 75vh;
        overflow: auto;
      }
    </style>  
    `;
  }
}

customElements.define('user-actions-menu', UserActionsMenu);
