import './ChatUserSearch.js';
import './ChatListItem.js';

export class ChatList extends HTMLElement {
  #state = {
    loggedInUsername: '',
    currentItemCount: 0,
    totalItemCount: 0,
    items: [],
  };

  constructor() {
    super();
    this.chatComponent = document.querySelector('chat-page');

    this.toggleUserSearchBar = this.toggleUserSearchBar.bind(this);
    this.loadMoreItems = this.loadMoreItems.bind(this);
  }

  setData(data, username) {
    this.#state.loggedInUsername = username;
    this.#state.items = data.items;
    this.#state.totalItemCount = data.count;
    this.render();
  }

  disconnectedCallback() {
    this.searchButton?.removeEventListener('click', this.toggleUserSearchBar);
    this.listContainer?.removeEventListener('scroll', this.loadMoreItems);
  }

  render() {
    this.innerHTML = this.template();

    this.searchButton = this.querySelector('.new-chat');
    this.searchButton.addEventListener('click', this.toggleUserSearchBar);
    this.serachBar = this.querySelector('chat-user-search');
    this.serachBar.user = this.#state.loggedInUsername;

    this.listContainer = this.querySelector('#chat-list-wrapper');
    this.list = this.querySelector('#chat-list');
    console.log('Chat list count:', this.#state.totalItemCount, this.#state.items);
    if (this.#state.totalItemCount > 0) {
      this.list.innerHTML = '';
      this.renderListItems();
      // this.#state.items.forEach((chat) => {
      //   const listItem = document.createElement('chat-list-item-component');
      //   listItem.setData(chat);
      //   this.list.appendChild(listItem);
      // });
    }
    this.listContainer.addEventListener('scrollend', this.loadMoreItems);
  }

  renderListItems(index = 0) {
    for (let i = index; i < this.#state.items.length; i++) {
      const listItem = document.createElement('chat-list-item-component');
      listItem.setData(this.#state.items[i]);
      this.list.appendChild(listItem);
      ++this.#state.currentItemCount;
    }
  }

  // TODO
  addnewListItemToTop() {
  }

  /* ------------------------------------------------------------------------ */
  /*     Event handlers                                                       */
  /* ------------------------------------------------------------------------ */
  toggleUserSearchBar() {
    const userSearch = document.getElementById('chat-user-search');
    userSearch?.classList.toggle('d-none');
  }

  async loadMoreItems(event) {
    const { scrollTop, scrollHeight, clientHeight } = event.target;
    const threshold = 5;
    if (Math.ceil(scrollTop + clientHeight) < scrollHeight - threshold ||
      this.#state.currentItemCount === this.#state.totalItemCount) {
      return;
    }
    const data = await this.chatComponent.fetchChatList(this.#state.currentItemCount);
    if (!data) {
      return;
    }
    this.#state.items = [...this.#state.items, ...data.items];
    this.renderListItems();
  }

  addNewChat(data) {
    console.log('Add new chat:', data);
    const chatData = {
      chat_id: data.chat_id,
      username: data.username,
      nickname: data.nickname,
      avatar: data.avatar,
      is_online: data.is_online,
      is_blocked_user: data.is_blocked_user,
      is_blocked_by_user: data.is_blocked_by_user,
      unread_messages_count: 0,
      last_message: data.messages[0],
    };
    this.#state.items.unshift(chatData);
    this.#state.totalItemCount += 1;
    this.render(); // TODO: Will be replaced by addnewListItemToTop
    const event = new CustomEvent('chatItemSelected', { detail: data, bubbles: true });
    this.dispatchEvent(event);
  }

  restartChat(data) {
    console.log('Restart chat / items before adding new one:', this.#state.items);
    const index = this.#state.items.findIndex((chat) => chat.username === data.username);
    console.log('Restart chat:', index);
    if (index !== -1) {
      const tmp = this.#state.items[index];
      tmp.unread_messages_count = 0;
      this.#state.items.splice(index, 1);
      this.#state.items.unshift(tmp);
      this.render();
      const event = new CustomEvent('chatItemSelected', { detail: data, bubbles: true });
      this.dispatchEvent(event);
    } else {
      this.addNewChat(data);
    }
  }

  /* ------------------------------------------------------------------------ */
  /*     Template & style                                                     */
  /* ------------------------------------------------------------------------ */

  template() {
    return `
	  <div class="d-flex flex-column ms-4 py-4 h-100">
      <div class="d-flex felx-row justify-content-between align-items-center me-3 gap-3 sticky-top">
        <h5 class="m-0">Conversations</h5>
        <button class="btn new-chat me-3 p-0"><i class="bi bi-pencil-square"></i></button>
      </div>
      <div class="overflow-auto" id="chat-list-wrapper">
        <chat-user-search></chat-user-search>
        <ul class="list-group border-top-1 pt-4" id="chat-list"></ul>
      </div>
    </div>
	  `;
  }
}

customElements.define('chat-list-component', ChatList);
