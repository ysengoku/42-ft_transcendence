import './ChatListItem.js';

export class ChatList extends HTMLElement {
  #state = {
    listItems: '',
    itemCount: 0,
  };

  constructor() {
    super();
    this.chatListData = [];
  }

  setData(data, count) {
    this.#state.itemCount = count;
    this.chatListData = data;
    this.render();
  }

  render() {
    this.innerHTML = this.template();

    if (this.#state.itemCount > 1) {
      const listContainer = this.querySelector('#chat-list');
      listContainer.innerHTML = '';
      this.chatListData.forEach((chat) => {
        const listItem = document.createElement('chat-list-item-component');
        listItem.setData(chat);
        listContainer.appendChild(listItem);
      });
    }
  }

  template() {
    if (this.#state.itemCount < 1) {
      return `
        <div class="border-end d-flex flex-column h-100 overflow-auto">
          <h5 class="pt-3">Conversations</h5>
          <p class="mt-3 pe-2 text-center">No conversations yet</p>
        </div>
        `;
    }
    return `
	  <div class="border-end d-flex flex-column h-100 overflow-auto">
      <h5 class="pt-3">Conversations</h5>
      <ul class="list-group flex-grow-1 overflow-auto" id="chat-list">
          <chat-list-item-component></chat-list-item-component>
      </ul>
    </div>
	  `;
  }
}

customElements.define('chat-list-component', ChatList);
