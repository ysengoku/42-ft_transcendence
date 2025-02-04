import './ChatListItem.js';

export class ChatList extends HTMLElement {
  constructor() {
    super();
    this.chatListData = [];
  }

  setData(data) {
    this.chatListData = data;
    this.renderListItems();
  }

  connectedCallback() {
    this.render();
  }

  renderListItems() {
    const listContainer = this.querySelector('#chat-list');
    listContainer.innerHTML = '';
    this.chatListData.forEach((chat) => {
      const listItem = document.createElement('chat-list-item-component');
      listItem.setData(chat);
      listContainer.appendChild(listItem);
    });
  }

  render() {
    this.innerHTML = `
	  <div class="border-end d-flex flex-column h-100 overflow-auto">
      <h5 class="py-3">Conversations</h5>
      <ul class="list-group flex-grow-1 overflow-auto" id="chat-list">
          <chat-list-item-component></chat-list-item-component>
          <chat-list-item-component></chat-list-item-component>
          <chat-list-item-component></chat-list-item-component>
          <chat-list-item-component></chat-list-item-component>
          <chat-list-item-component></chat-list-item-component>
        </ul>
      </div>
	  `;
  }
}

customElements.define('chat-list-component', ChatList);
