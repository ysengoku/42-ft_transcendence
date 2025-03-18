import './ChatUserSearch.js';
import './ChatListItem.js';

export class ChatList extends HTMLElement {
  #state = {
    loggedinUsername: '',
    listItems: '',
    itemCount: 0,
  };

  constructor() {
    super();
    this.chatListData = [];

    this.toggleUserSearchBar = this.toggleUserSearchBar.bind(this);
  }

  setData(data, count, username) {
    this.#state.loggedinUsername = username;
    this.#state.itemCount = count;
    this.chatListData = data;
    this.render();
  }

  restartChat(data) {
    const index = this.chatListData.findIndex((chat) => chat.username === data.username);
    if (index !== -1) {
      const tmp = this.chatListData[index];
      tmp.unread_messages_count = 0;
      this.chatListData.splice(index, 1);
      this.chatListData.unshift(tmp);
      this.render();
      const event = new CustomEvent('chatItemSelected', { detail: data, bubbles: true });
      this.dispatchEvent(event);
    } else {
      this.addNewChat(data);
    }
  }

  addNewChat(data) {
    this.chatListData.unshift(data);
    this.#state.itemCount += 1;
    this.render();
    const event = new CustomEvent('chatItemSelected', { detail: data, bubbles: true });
    this.dispatchEvent(event);
  }

  render() {
    this.innerHTML = this.template();

    this.searchButton = this.querySelector('.new-chat');
    this.searchButton.addEventListener('click', this.toggleUserSearchBar);
    this.serachBar = this.querySelector('chat-user-search');
    this.serachBar.user = this.#state.loggedinUsername;

    this.listContainer = this.querySelector('#chat-list');
    if (this.#state.itemCount > 1) {
      this.listContainer.innerHTML = '';
      this.chatListData.forEach((chat) => {
        const listItem = document.createElement('chat-list-item-component');
        listItem.setData(chat);
        this.listContainer.appendChild(listItem);
      });
    } else {
      const noChat = document.createElement('li');
      noChat.textContent = 'No conversations yet';
      noChat.classList.add('text-center', 'border-top', 'mt-3', 'pe-2', 'pt-3');
      this.listContainer.appendChild(noChat);
    }
  }

  toggleUserSearchBar() {
    const userSearch = document.getElementById('chat-user-search');
    userSearch?.classList.toggle('d-none');
  }

  template() {
    return `
	  <div class="border-end d-flex flex-column h-100">
      <div class="d-flex felx-row justify-content-between align-items-center me-3 gap-3 sticky-top">
        <h5 class="m-0">Conversations</h5>
        <button class="btn new-chat me-3 p-0"><i class="bi bi-pencil-square"></i></button>
      </div>
      <div class="overflow-auto">
        <chat-user-search></chat-user-search>
        <ul class="list-group flex-grow-1 overflow-auto border-top-1 pt-4" id="chat-list"></ul>
      </div>
    </div>
	  `;
  }
}

customElements.define('chat-list-component', ChatList);
