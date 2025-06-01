/**
 * @file ChatList Component
 * @description Render the chat list, manage the display of list items, and handle user interactions
 *              such as searching and infinite scrolling.
 * @module ChatList
 */

import './ChatUserSearch.js';
import './ChatListItem.js';
import { getRelativeTime } from '@utils';
import { loader } from '@utils';

/**
 * @class ChatList
 * @extends {HTMLElement}
 * @classdesc Custom web component for rendering a list of chat conversations.
 */
export class ChatList extends HTMLElement {
  /**
   * Private state for the ChatList component.
   * @type {Object}
   * @property {string} loggedInUsername - The username of the logged-in user.
   * @property {number} currentListItemCount - Count of items processed (rendered or skipped).
   * @property {number} fetchedItemCount - Count of items fetched from the server.
   * @property {number} displayedItemCount - Count of items that have been rendered.
   * @property {number} totalItemCount - Total number of items in database.
   * @property {Array} items - Array of chat items.
   */
  #state = {
    loggedInUsername: '',
    currentListItemCount: 0,
    fetchedItemCount: 0,
    displayedItemCount: 0,
    totalItemCount: -1,
    items: [],
  };

  #getCurrentChatUsername = null;

  constructor() {
    super();

    // Reference to the main chat component
    this.chatComponent = document.querySelector('chat-page');

    this.toggleUserSearchBar = this.toggleUserSearchBar.bind(this);
    this.handleScrollEnd = this.handleScrollEnd.bind(this);
  }

  /**
   * Set the data for the chat list component, called from the parent component.
   * @param {Object} data - Data object containing chat items and total count.
   * @param {string} username - Logged-in user's username.
   * @param {Function} getCurrentChatUsername
   */
  setData(data, username, getCurrentChatUsername) {
    console.time('ChatList setData');
    this.#state.loggedInUsername = username;
    if (data) {
      this.#state.items = data.items;
      this.#state.fetchedItemCount = data.items.length;
      this.#state.totalItemCount = data.count;
      this.#getCurrentChatUsername = getCurrentChatUsername;
    }
    console.timeEnd('ChatList setData');
    this.render();
    if (this.#state.totalItemCount === 0) {
      const noChatsMessage = document.createElement('li');
      noChatsMessage.classList.add('list-group-item', 'text-center', 'border-0', 'pt-5', 'pe-5', 'no-chats-message');
      noChatsMessage.style.backgroundColor = 'transparent';
      noChatsMessage.textContent = 'You have no conversations yet.';
      this.list.appendChild(noChatsMessage);
    }
  }

  disconnectedCallback() {
    this.searchButton?.removeEventListener('click', this.toggleUserSearchBar);
    this.listContainer?.removeEventListener('scrollend', this.handleScrollEnd);
  }

  /* ------------------------------------------------------------------------ */
  /*     Render                                                               */
  /* ------------------------------------------------------------------------ */
  async render() {
    console.time('ChatList render');
    this.innerHTML = this.template() + this.style();
    this.loader = this.querySelector('.chat-loader');
    this.loader.innerHTML = loader();

    // Initialize elements
    this.searchButton = this.querySelector('.new-chat');
    this.searchButton.addEventListener('click', this.toggleUserSearchBar);
    this.serachBar = this.querySelector('chat-user-search');
    this.serachBar.user = this.#state.loggedInUsername;

    this.listContainer = this.querySelector('#chat-list-wrapper');
    this.list = this.querySelector('#chat-list');
    if (this.#state.totalItemCount > 0) {
      this.list.innerHTML = '';
      this.renderListItems();
      this.listContainer.addEventListener('scrollend', this.handleScrollEnd);
    }

    // Load more items if needed to reach the minimum display count
    while (this.#state.currentListItemCount < this.#state.totalItemCount && this.#state.displayedItemCount < 10) {
      await this.loadMoreItems();
    }
    console.timeEnd('ChatList render');
  }

  /**
   * Render chat list items starting from a given index.
   * @param {number} [index=0] - Starting index in the items array.
   */
  renderListItems(index = 0) {
    for (let i = index; i < this.#state.items.length; i++) {
      // Skip rendering if the item already exists in the DOM
      if (this.list.querySelector(`#chat-item-${this.#state.items[i].username}`) !== null) {
        continue;
      }
      // Skip blocked chats or those without a last message
      if (this.#state.items[i].is_blocked_by_user || !this.#state.items[i].last_message) {
        this.#state.currentListItemCount += 1;
        continue;
      }
      const listItem = document.createElement('chat-list-item-component');
      listItem.setData(this.#state.items[i], this.#state.loggedInUsername);
      if (this.#state.items[i].username === this.#getCurrentChatUsername()) {
        listItem.querySelector('.chat-list-item').classList.add('active');
      }
      this.list.appendChild(listItem);
      ++this.#state.currentListItemCount;
      ++this.#state.displayedItemCount;
    }
  }

  async loadMoreItems() {
    const data = await this.chatComponent.fetchChatList(this.#state.fetchedItemCount);
    if (!data) {
      return;
    }
    this.#state.items = [...this.#state.items, ...data.items];
    this.#state.fetchedItemCount += data.items.length;
    this.renderListItems(this.#state.currentListItemCount);
  }

  prependNewListItem(newItemData) {
    const noChatsMessage = this.list.querySelector('.no-chats-message');
    if (noChatsMessage) {
      noChatsMessage.remove();
    }
    const listItem = document.createElement('chat-list-item-component');
    listItem.setData(newItemData, this.#state.loggedInUsername);
    listItem.querySelector('.chat-list-item').classList.add('active');
    listItem.querySelector('.chat-list-item-unread-message').classList.add('d-none');
    const chatListItems = document.querySelectorAll('.chat-list-item');
    chatListItems.forEach((item) => {
      if (item !== listItem) {
        item.classList.remove('active');
      }
    });
    this.list.prepend(listItem);
  }

  async refreshList() {
    const data = await this.chatComponent.fetchChatList();
    if (!data) {
      return;
    }
    this.#state.items = data.items;
    this.#state.items[0].unread_messages_count = 0;
    this.#state.fetchedItemCount = data.items.length;
    this.#state.currentListItemCount = 0;
    this.#state.displayedItemCount = 0;
    this.list.innerHTML = '';
    this.#state.totalItemCount = data.count;
    this.renderListItems();
    while (this.#state.currentListItemCount < this.#state.totalItemCount && this.#state.displayedItemCount < 10) {
      await this.loadMoreItems();
    }
  }

  /* ------------------------------------------------------------------------ */
  /*     Event handlers                                                       */
  /* ------------------------------------------------------------------------ */
  toggleUserSearchBar() {
    const userSearch = document.getElementById('chat-user-search');
    userSearch?.classList.toggle('d-none');
    this.listContainer.scrollTop = 0;
  }

  hideUserSearchBar() {
    const userSearch = document.getElementById('chat-user-search');
    userSearch?.classList.add('d-none');
  }

  // TODO: Avoid multiple calls before the previous one is completed
  async handleScrollEnd(event) {
    const { scrollTop, scrollHeight, clientHeight } = event.target;
    const threshold = 5;
    if (
      Math.ceil(scrollTop + clientHeight) < scrollHeight - threshold ||
      this.#state.currentListItemCount === this.#state.totalItemCount
    ) {
      return;
    }
    await this.loadMoreItems();
  }

  /**
   * Add a new chat to the top of the list.
   * Dispatche a 'chatItemSelected' event after updating.
   * @param {Object} data - New chat data.
   */
  addNewChat(data) {
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
    this.#state.displayedItemCount += 1;
    this.#state.currentListItemCount += 1;
    this.#state.fetchedItemCount += 1;
    if (this.list.querySelector(`#chat-item-${chatData.username}`) === null) {
      this.prependNewListItem(chatData);
    }
    this.hideUserSearchBar();
    // TODO: Replace by setData to chatMessageArea
    const event = new CustomEvent('chatItemSelected', { detail: data.username, bubbles: true });
    this.dispatchEvent(event);
  }

  /**
   * Restart an existing chat. Move to the top if it existes in this chat list or adds it if not present.
   * Dispatche a 'chatItemSelected' event after updating.
   * @param {Object} data - Chat data to be restarted.
   */
  restartChat(data) {
    const index = this.#state.items.findIndex((chat) => chat.username === data.username);
    if (index !== -1) {
      const tmp = this.#state.items[index];
      tmp.unread_messages_count = 0;
      this.#state.items.splice(index, 1);
      this.#state.items.unshift(tmp);
      const component = document.getElementById(`chat-item-${data.username}`);
      component?.remove();
      this.prependNewListItem(tmp);
    } else {
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
      this.#state.displayedItemCount += 1;
      this.#state.currentListItemCount += 1;
      this.prependNewListItem(chatData);
    }
    const event = new CustomEvent('chatItemSelected', { detail: data.username, bubbles: true });
    this.dispatchEvent(event);
    this.hideUserSearchBar();
  }

  async updateListWithIncomingMessage(data) {
    const currentChatUsername = this.#getCurrentChatUsername();
    const index = this.#state.items.findIndex((chat) => chat.chat_id === data.chat_id);
    if (index === -1) {
      await this.refreshList();
      return;
    }
    if (this.#state.items[index].username === currentChatUsername) {
      this.#state.items[index].unread_messages_count = 0;
    } else {
      this.#state.items[index].unread_messages_count += 1;
    }
    if (index === 0) {
      this.#state.items[0].last_message = data;
      const component = document.getElementById(`chat-item-${this.#state.items[0].username}`);
      const lastMessageTime = component.querySelector('.chat-list-item-last-message-time');
      const lastMessageContent = component.querySelector('.chat-list-item-last-message');
      const unreadMessages = component.querySelector('.chat-list-item-unread-message');

      lastMessageTime.textContent = getRelativeTime(data.date);
      let content = data.sender.toLowerCase() === this.#state.loggedInUsername.toLowerCase() ? 'You: ' : '';
      content += data.content;
      lastMessageContent.textContent = content;
      if (this.#state.items[0].unread_messages_count === 0) {
        unreadMessages.classList.add('d-none');
      } else {
        unreadMessages.classList.remove('d-none');
        unreadMessages.textContent =
          this.#state.items[0].unread_messages_count > 9 ? '9+' : this.#state.items[0].unread_messages_count;
      }
    } else {
      const tmp = this.#state.items[index];
      tmp.last_message = {
        content: data.content,
        date: data.date,
        sender: data.sender,
        is_read: false,
        is_liked: false,
      };
      this.#state.items.splice(index, 1);
      this.#state.items.unshift(tmp);
      this.render();
    }
  }

  updateOnlineStatus(data) {
    const username = data.data.username;
    const index = this.#state.items.findIndex((chat) => chat.username.toLowerCase() === username.toLowerCase());
    if (index !== -1) {
      this.#state.items[index].is_online = data.online;
      const component = document.getElementById(`chat-item-${this.#state.items[index].username}`);
      const onlineStatus = component.querySelector('.chat-list-status-indicator');
      data.online ? onlineStatus.classList.add('online') : onlineStatus.classList.remove('online');
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
      <chat-user-search></chat-user-search>
      <div class="overflow-auto" id="chat-list-wrapper">
        <div class="chat-loader d-flex text-center justify-content-center align-items-center me-4 mt-5 d-none"></div>
        <ul class="list-group border-top-1 pt-4" id="chat-list"></ul>
      </div>
    </div>
	  `;
  }

  style() {
    return `
      <style>
      .chat-list-item {
        border: none;
        background-color: rgba(var(--bs-body-bg-rgb), 0.3);
        border-radius: 0.5rem !important;
      }
      .list-group-item.active {
        background-color: var(--pm-primary-500) !important;
        border: none;
        .chat-list-status-indicator {
          outline: 1px solid var(--pm-primary-500) !important;
        }
      }
      .chat-list-status-indicator {
        position: absolute;
        bottom: 0;
        right: -2px;
        outline: 2px solid rgba(var(--bs-body-bg-rgb), 0.4) !important;
      }
      .chat-list-item-content {
        min-width: 0;
      }
      .chat-list-item-unread-message {
        background-color: var(--pm-red-500);
        color: var(--pm-gray-100);
        border-radius: 50%;
        width: 24px;
        height: 24px;
        font-size: 0.8rem;
        display: flex;
        align-items: center;
        justify-content: center;
        inline-height: 1;
       }
      .chat-list-item-nickname {
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .chat-list-item-last-message {
        overflow: hidden;
        text-overflow: ellipsis;
        word-break: break-all;
        display: -webkit-box;
        -webkit-line-clamp: 1;
        -webkit-box-orient: vertical;
      }
      .blocked {
        filter: opacity(0.6);
      }
    </style>
    `;
  }
}

customElements.define('chat-list-component', ChatList);
