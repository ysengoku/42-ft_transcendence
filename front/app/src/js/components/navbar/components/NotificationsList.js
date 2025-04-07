import { socketManager } from '@socket';
import { mockNotificationsData } from '@mock/functions/mockNotificationsData';

export class NotificationsList extends HTMLElement {
  #state = {
    currentTab: 'unread',
    isLoading: false,
  };

  #unread = {
    notifications: [],
    totalCount: 0,
    listLength: 0,
  };

  #read = {
    notifications: [],
    totalCount: 0,
    listLength: 0,
  };

  constructor() {
    super();

    this.fetchNotifications = this.fetchNotifications.bind(this);
    this.loadMoreNotifications = this.loadMoreNotifications.bind(this);
    this.clearList = this.clearList.bind(this);
    this.toggleTab = this.toggleTab.bind(this);
  }

  connectedCallback() {
    this.render(true);
  }

  disconnectedCallback() {
    this.button?.removeEventListener('shown.bs.dropdown', this.fetchNotifications);
    this.dropdown?.removeEventListener('scrollend', this.loadMoreNotifications);
    this.button?.removeEventListener('hidden.bs.dropdown', this.clearList);
    this.unreadTab?.removeEventListener('click', this.toggleTab);
    this.readTab?.removeEventListener('click', this.toggleTab);
  }

  /* ------------------------------------------------------------------------ */
  /*     Render                                                               */
  /* ------------------------------------------------------------------------ */

  render() {
    this.innerHTML = this.template() + this.style();

    this.button = document.getElementById('navbar-notifications-button');
    this.dropdown = document.getElementById('notifications-dropdown');
    this.list = this.querySelector('#notifications-list');
    this.unreadTab = this.querySelector('#unread-notifications-tab');
    this.readTab = this.querySelector('#read-notifications-tab');

    this.dropdown?.addEventListener('scrollend', this.loadMoreNotifications);
    this.button?.addEventListener('shown.bs.dropdown', this.fetchNotifications);
    this.button?.addEventListener('hidden.bs.dropdown', this.clearList);
    this.unreadTab?.addEventListener('click', this.toggleTab);
    this.readTab?.addEventListener('click', this.toggleTab);
  }

  async fetchNotifications(unread = this.#state.currentTab === 'unread') {
    const notificationButton = document.querySelector('notifications-button');
    notificationButton?.querySelector('.notification-badge')?.classList.add('d-none');

    // TODO: Replace by API request
    const data = await mockNotificationsData();

    unread ? (
      this.#unread.totalCount = data.count,
      this.#unread.notifications.push(...data.items)
    ): (
      this.#read.totalCount = data.count,
      this.#read.notifications.push(...data.items)
    );
    this.renderList(unread);
  }

  renderList(unread) {
    const listData = unread ? this.#unread : this.#read;

    if (listData.notifications.length === 0) {
      this.list.innerHTML = this.noNotificationTemplate();
    }
    for (let i = listData.listLength; i < listData.notifications.length; i++) {
      const item = document.createElement('notifications-list-item');
      item.data = listData.notifications[i];
      if (i === 0) {
        item.querySelector('.dropdown-list-item').classList.add('border-top-0');
      }
      this.list.appendChild(item);
      listData.listLength++;
      // if (unread) {
      //   const message = {
      //     action: 'read_notification',
      //     id: listData.notifications[i].id,
      //   };
      //   socketManager.socket.send(JSON.stringify(message));
      // }
    }
    unread ?
      this.#unread.listLength = listData.listLength :
      this.#read.listLength = listData.listLength;
  }

  /* ------------------------------------------------------------------------ */
  /*     Event handlers                                                       */
  /* ------------------------------------------------------------------------ */

  async toggleTab(event) {
    event.preventDefault();
    event.stopPropagation();
    if (this.#state.isLoading) {
      return;
    }
    const clickedTab = event.target.id === 'unread-notifications-tab' ? 'unread' : 'read';
    if (clickedTab !== this.#state.currentTab) {
      this.#state.currentTab = clickedTab;
      this.clearList();
      if (clickedTab === 'unread') {
        this.unreadTab.classList.add('active');
        this.readTab.classList.remove('active');
      } else {
        this.readTab.classList.add('active');
        this.unreadTab.classList.remove('active');
      }
      this.#state.isLoading = true;
      await this.fetchNotifications();
      this.#state.isLoading = false;
    }
  };

  async loadMoreNotifications(event) {
    const { scrollTop, scrollHeight, clientHeight } = event.target;
    const threshold = 5;
    const totalCount = this.#state.currentTab === 'unread' ? this.#unread.totalCount : this.#read.totalCount;
    const listLength = this.#state.currentTab === 'unread' ? this.#unread.listLength : this.#read.listLength;
    if (Math.ceil(scrollTop + clientHeight) < scrollHeight - threshold || totalCount <= listLength ||
      this.#state.isLoading) {
      return;
    }
    this.#state.isLoading = true;
    await this.fetchNotifications();
    this.#state.isLoading = false;
  }

  clearList() {
    this.list.innerHTML = '';
    this.#unread.notifications = [];
    this.#unread.listLength = 0;
    this.#unread.totalCount = 0;
    this.#read.notifications = [];
    this.#read.listLength = 0;
    this.#read.totalCount = 0;
  }

  /* ------------------------------------------------------------------------ */
  /*     Template & style                                                     */
  /* ------------------------------------------------------------------------ */

  template() {
    return `
    <div class="notifications-wrapper d-flex flex-column justify-content-start border-0 px-2">
      <div class="pt-4 pb-2 dropdown-list-header border-0" sticky>
        <h6>Notifications</h6>
        <ul class="nav nav-tabs card-header-tabs border-0">
          <li class="nav-item">
            <a class="nav-link active" aria-current="true" id="unread-notifications-tab">Unread</a>
          </li>
          <li class="nav-item">
            <a class="nav-link" id="read-notifications-tab">Read</a>
          </li>
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
