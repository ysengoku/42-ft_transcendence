import { apiRequest, API_ENDPOINTS } from '@api';
import { socketManager } from '@socket';

export class NotificationsList extends HTMLElement {
  #state = {
    currentTab: 'all',
    isLoading: false,
  };

  #unread = {
    notifications: [],
    totalCount: 0,
    listLength: 0,
  };

  #all = {
    notifications: [],
    totalCount: 0,
    listLength: 0,
  };

  constructor() {
    super();

    this.renderList = this.renderList.bind(this);
    this.loadMoreNotifications = this.loadMoreNotifications.bind(this);
    this.toggleTab = this.toggleTab.bind(this);
    this.readNotification = this.readNotification.bind(this);
    this.markAllAsRead = this.markAllAsRead.bind(this);
    this.preventListClose = this.preventListClose.bind(this);
    this.resetList = this.resetList.bind(this);
  }

  connectedCallback() {
    this.render();
  }

  disconnectedCallback() {
    this.button?.removeEventListener('shown.bs.dropdown', this.renderList);
    this.button?.removeEventListener('hidden.bs.dropdown', this.resetList);
    this.dropdown?.removeEventListener('scrollend', this.loadMoreNotifications);
    this.dropdown?.removeEventListener('click', this.preventListClose);
    this.unreadTab?.removeEventListener('click', this.toggleTab);
    this.allTab?.removeEventListener('click', this.toggleTab);
    this.markAllAsReadButton?.removeEventListener('click', this.markAllAsRead);
  }

  /* ------------------------------------------------------------------------ */
  /*     Render                                                               */
  /* ------------------------------------------------------------------------ */

  render() {
    this.innerHTML = this.template() + this.style();

    this.button = document.getElementById('navbar-notifications-button');
    this.dropdown = document.getElementById('notifications-dropdown');
    this.list = this.querySelector('#notifications-list');
    this.allTab = this.querySelector('#all-notifications-tab');
    this.unreadTab = this.querySelector('#unread-notifications-tab');
    this.markAllAsReadButton = this.querySelector('#mark-all-as-read');

    this.dropdown?.addEventListener('scrollend', this.loadMoreNotifications);
    this.dropdown?.addEventListener('click', this.preventListClose);
    this.button?.addEventListener('shown.bs.dropdown', this.renderList);
    this.button?.addEventListener('hidden.bs.dropdown', this.resetList);
    this.allTab?.addEventListener('click', this.toggleTab);
    this.unreadTab?.addEventListener('click', this.toggleTab);
    this.markAllAsReadButton?.addEventListener('click', this.markAllAsRead);
  }

  async renderList() {
    this.button?.querySelector('.notification-badge')?.classList.add('d-none');

    const read = this.#state.currentTab === 'unread' ? 'false' : 'all';
    const listData = this.#state.currentTab === 'unread' ? this.#unread : this.#all;
    const data = await this.fetchNotifications(read, 10, listData.listLength);
    if (!data) {
      return;
    }
    listData.totalCount = data.count;
    listData.notifications.push(...data.items);
    if (listData.notifications.length === 0) {
      this.list.innerHTML = this.noNotificationTemplate();
    }
    for (let i = listData.listLength; i < listData.notifications.length; i++) {
      const item = document.createElement('notifications-list-item');
      item.data = listData.notifications[i];
      if (i === 0) {
        item.querySelector('.dropdown-list-item').classList.add('border-top-0');
      }
      if (!listData.notifications[i].is_read) {
        item.addEventListener('click', this.readNotification);
        item.id = `notification-${listData.notifications[i].id}`;
        item.classList.add('unread');
      }
      this.list.appendChild(item);
      listData.listLength++;
    }
  }

  /* ------------------------------------------------------------------------ */
  /*     Event handlers                                                       */
  /* ------------------------------------------------------------------------ */

  async fetchNotifications(read, limit, offset) {
    const response = await apiRequest(
        'GET',
        /* eslint-disable-next-line new-cap */
        API_ENDPOINTS.NOTIFICATIONS(read, limit, offset),
        null, false, true);
    if (response.success) {
      return response.data;
    } else {
      return null;
    }
  }

  async toggleTab(event) {
    event.preventDefault();
    event.stopPropagation();
    if (this.#state.isLoading) {
      return;
    }
    const clickedTab = event.target.id === 'unread-notifications-tab' ? 'unread' : 'all';
    if (clickedTab !== this.#state.currentTab) {
      this.#state.currentTab = clickedTab;
      this.clearList();
      if (clickedTab === 'unread') {
        this.unreadTab.classList.add('active');
        this.allTab.classList.remove('active');
      } else {
        this.allTab.classList.add('active');
        this.unreadTab.classList.remove('active');
      }
      this.#state.isLoading = true;
      await this.renderList();
      this.#state.isLoading = false;
    }
  };

  async loadMoreNotifications(event) {
    const { scrollTop, scrollHeight, clientHeight } = event.target;
    const threshold = 5;
    const totalCount = this.#state.currentTab === 'unread' ? this.#unread.totalCount : this.#all.totalCount;
    const listLength = this.#state.currentTab === 'unread' ? this.#unread.listLength : this.#all.listLength;
    if (Math.ceil(scrollTop + clientHeight) < scrollHeight - threshold || totalCount <= listLength ||
      this.#state.isLoading) {
      return;
    }
    this.#state.isLoading = true;
    await this.renderList();
    this.#state.isLoading = false;
  }

  readNotification(event) {
    event.stopPropagation();
    event.preventDefault();
    const element = event.target.closest('notifications-list-item');
    if (element.classList.contains('unread')) {
      const notificationId = element.id.split(/-(.*)/s)[1];
      const message = {
        action: 'read_notification',
        data: {
          id: notificationId,
        }
      };
      socketManager.sendMessage('livechat', message);
      element.removeEventListener('click', this.readNotification);
      element.classList.remove('unread');
      const currentList = this.#state.currentTab === 'unread' ? this.#unread : this.#all;
      const currentItem = currentList.notifications.find((notification) => notification.id === element.id);
      if (currentItem) {
        currentItem.is_read = true;
      }
    }
  }

  async markAllAsRead(event) {
    event.stopPropagation();
    event.preventDefault();

    let listLength = 0;
    let totalCount = 0;
    const unreadList = [];
    do {
      const list = await this.fetchNotifications(false, 10, listLength);
      if (!list) {
        return;
      }
      unreadList.push(...list.items);
      listLength += list.items.length;
      totalCount = list.count;
    } while (listLength < totalCount);
    console.log('unreadList', unreadList);
    unreadList.forEach((item) => {
      const message = {
        action: 'read_notification',
        id: item.id,
      };
      socketManager.sendMessage('livechat', message);
    });
    this.#state.isLoading = true;
    await this.renderList();
    this.#state.isLoading = false;
  }

  preventListClose(event) {
    event.stopPropagation();
    event.preventDefault();
  }

  clearList() {
    const listItems = this.querySelectorAll('notifications-list-item');
    listItems.forEach((item) => {
      item.removeEventListener('click', this.readNotification);
    });
    this.list.innerHTML = '';
    this.#unread.notifications = [];
    this.#unread.listLength = 0;
    this.#unread.totalCount = 0;
    this.#all.notifications = [];
    this.#all.listLength = 0;
    this.#all.totalCount = 0;
  }

  resetList() {
    this.allTab.classList.add('active');
    this.unreadTab.classList.remove('active');
    this.#state.currentTab = 'all';
    this.clearList();
  }

  /* ------------------------------------------------------------------------ */
  /*     Template & style                                                     */
  /* ------------------------------------------------------------------------ */

  template() {
    return `
    <div class="notifications-wrapper d-flex flex-column justify-content-start border-0 px-2">
      <div class="pt-4 pb-2 dropdown-list-header border-0" sticky>
        <h6>Notifications</h6>
        <ul class="d-flex justify-content-between nav nav-tabs card-header-tabs border-0">
          <div class="d-flex">
            <li class="nav-item">
              <a class="nav-link active" aria-current="true" id="all-notifications-tab">All</a>
            </li>
            <li class="nav-item">
              <a class="nav-link" id="unread-notifications-tab">Unread</a>
            </li>
          </div>
          <button class="btn" id="mark-all-as-read">Mark all as read</button>
        </ul>
      </div>

      <ul class="dropdown-list list-group mb-2" id="notifications-list"></ul>
    </div>
    `;
  }

  style() {
    return `
    <style>
    .notifications-wrapper {
      .card-header-tabs .nav-link {
        color: var(--bs-body-color);
        border: none;
        background-color: transparent !important;
        }
      .card-header-tabs .nav-link.active {
        border-bottom: 4px solid var(--bs-body-color);
        font-weight: bold;
        margin-bottom: 8px;
      }
    }
    #notifications-list {
      max-height: 75vh;
      max-width: 480px;
    }
    .notification-time {
      color: var(--pm-gray-400);
    }
    .call-to-action-groupe button {
      border: none;
      background: none;
    }
    .unread-badge {
      display: none;
    }
    .unread .unread-badge {
      color: var(--pm-primary-500);
      display: block;
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
