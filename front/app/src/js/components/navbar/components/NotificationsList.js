import { mockNotificationsData } from '@mock/functions/mockNotificationsData';

export class NotificationsList extends HTMLElement {
  #state = {
    notifications: [],
    totalNotificationsCount: 0,
    listLength: 0,
  };

  constructor() {
    super();

    this.renderList = this.renderList.bind(this);
    this.clearList = this.clearList.bind(this);
  }

  connectedCallback() {
    this.render();
  }

  disconnectedCallback() {
    this.button?.removeEventListener('shown.bs.dropdown', this.renderList);
    this.button?.removeEventListener('hidden.bs.dropdown', this.clearList);
  }

  render() {
    this.innerHTML = this.template() + this.style();

    this.button = document.getElementById('navbar-notifications-button');
    this.list = this.querySelector('#notifications-list');

    // TODO: Handle websocket events (Add new notification to the list)

    this.button?.addEventListener('shown.bs.dropdown', this.renderList);
    this.button?.addEventListener('hidden.bs.dropdown', this.clearList);
  }

  async renderList() {
    await this.fetchNotifications();

    this.#state.notifications.forEach((notification) => {
      const item = document.createElement('notifications-list-item');
      item.data = notification;
      this.list.appendChild(item);
    });
  }

  async fetchNotifications() {
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

    // TODO: If list length is smaller than total notifications count, show "Show more" button
  }

  clearList() {
    this.list.innerHTML = '';
    this.#state.notifications = [];
    this.#state.listLength = 0;
    this.#state.totalNotificationsCount = 0;
  }

  template() {
    return `
    <div class="d-flex flex-column justify-content-start ps-3 pe-4">
      <h6 class="pt-2 pb-4 dropdown-list-header" sticky>Notifications</h6>
      <ul class="list-group mb-2" id="notifications-list"></ul>
    </div>
    `;
  }

  style() {
    return `
    <style>
    #notifications-list .dropdown-list-item:last-of-type {
      border-bottom: none;
      padding-bottom: 8px;
    }
	  .notifications-list-avatar {
	    width: 64px;
      height: 64px;
      object-fit: cover;
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
}

customElements.define('notifications-list', NotificationsList);
