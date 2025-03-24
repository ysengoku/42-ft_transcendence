import { mockNotificationsData } from '@mock/functions/mockNotificationsData';

export class NotificationsList extends HTMLElement {
  #state = {
    notifications: [],
    totalNotificationsCount: 0,
    listLength: 0,
  };

  constructor() {
    super();

    this.fetchNotifications = this.fetchNotifications.bind(this);
    this.clearList = this.clearList.bind(this);
  }

  connectedCallback() {
    this.render();
  }

  disconnectedCallback() {
    this.button?.removeEventListener('shown.bs.dropdown', this.fetchNotifications);
    this.button?.removeEventListener('hidden.bs.dropdown', this.clearList);
  }

  render() {
    this.innerHTML = this.template() + this.style();

    this.button = document.getElementById('navbar-notifications-button');
    this.list = this.querySelector('#notifications-list');

    // TODO: Handle websocket events (Add new notification to the list)

    this.button?.addEventListener('shown.bs.dropdown', this.fetchNotifications);
    this.button?.addEventListener('hidden.bs.dropdown', this.clearList);
  }

  async fetchNotifications() {
    const notificationButton = document.querySelector('notifications-button');
    notificationButton?.querySelector('.notification-badge')?.classList.add('d-none');

    this.#state.listLength = this.#state.notifications.length;
    // TODO: Replace by API request
    const data = await mockNotificationsData();

    data.forEach((item) => {
      const notification = {};
      notification.type = item.type;
      notification.date = item.data.date;
      notification.nickname = item.data.nickname;
      notification.avatar = item.data.avatar;
      notification.content = {};
      switch (notification.type) {
        case 'game_invite':
          notification.content.id = item.data.id;
          notification.content.username = item.data.username;
          break;
        case 'new_tournament':
          notification.content.id = item.data.id;
          notification.content.tournament_name = item.data.tournament_name;
          break;
        case 'new_friend':
          notification.content.username = item.data.username;
          break;
      }
      this.#state.notifications.push(notification);
    });

    this.renderList();
  }

  renderList() {
    this.list.innerHTML = '';
    if (this.#state.notifications.length === 0) {
      this.list.innerHTML = this.noNotificationTemplate();
    }

    for (let i = this.#state.listLength; i < this.#state.notifications.length; i++) {
      const item = document.createElement('notifications-list-item');
      item.data = this.#state.notifications[i];
      if (i === 0) {
        item.querySelector('.list-group-item')?.classList.add('border-top-0');
      }
      this.list.appendChild(item);
      this.#state.listLength++;
    }

    if (this.#state.totalNotificationsCount > this.#state.listLength) {
      this.renderShowMoreButton();
    }
  }

  clearList() {
    this.list.innerHTML = '';
    this.#state.notifications = [];
    this.#state.listLength = 0;
    this.#state.totalNotificationsCount = 0;
  }

  renderShowMoreButton() {
    const showMoreButtonContainer = document.createElement('li');
    showMoreButtonContainer.innerHTML = this.showMoreButtonTemplate();
    this.list.appendChild(showMoreButtonContainer);

    this.showMoreButton = showMoreButtonContainer.querySelector('#show-more-notifications');
    this.showMoreButton?.addEventListener('click', this.handleShowMoreNotifications);
  }

  handleShowMoreNotifications() {
    // TODO
  }

  template() {
    return `
    <div class="d-flex flex-column justify-content-start">
      <h6 class="py-4 dropdown-list-header" sticky>Notifications</h6>
      <ul class="dropdown-list list-group mb-2" id="notifications-list"></ul>
    </div>
    `;
  }

  style() {
    return `
    <style>
    #notifications-list {
      max-height: 75vh;
      max-width: 480px;
    }
	  .notifications-list-avatar {
	    width: 64px;
      height: 64px;
      object-fit: cover;
	  }
    .notification-time {
      color: var(--pm-gray-400);
    }
    .call-to-action-groupe button {
      border: none;
      background: none;
    }
    </style>
    `;
  }

  noNotificationTemplate() {
    return `
    <style>
    .list-group-item {
      border: none;
      position: relative;
    }
    li {
     list-style-type: none;
    }
    </style>
    <div class="list-group-item p-3">
      <p class="text-center m-0">No notification</p>
    </div>
    `;
  }

  showMoreButtonTemplate() {
    return `
    <style>
    #show-more-notifications {
      border: none;
      position: relative;
      border-top: 1px solid var(--bs-border-color);
    }
    li {
      list-style-type: none;
    }
    </style>
    <div class="list-group-item mt-4 p-3" id="show-more-notifications">
      <p class="text-center m-0">Show more notifications</p>
    </div>
    `;
  }
}

customElements.define('notifications-list', NotificationsList);
