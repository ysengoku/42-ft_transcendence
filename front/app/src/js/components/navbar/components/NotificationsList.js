/**
 * @module NotificationsList
 * @description
 * This module defines a custom notifications list component for the navbar.
 * It handles the rendering of notifications, toggling between unread and all notifications,
 * marking notifications as read, and loading more notifications on scroll.
 */
import { apiRequest, API_ENDPOINTS } from '@api';
import { auth } from '@auth';
import { socketManager } from '@socket';

/**
 * @class NotificationsList
 * @extends HTMLElement
 */
export class NotificationsList extends HTMLElement {
  /**
   * Private state of the NotificationsList component.
   * @property {string} - The current tab being displayed ('all' or 'unread').
   * @property {boolean} isLoading - Indicates if the notifications are currently being loaded.
   * @property {string} username - The username of the logged-in user.
   */
  #state = {
    currentTab: 'all',
    isLoading: false,
    username: '',
  };

  /**
   * Private state for unread and all notifications.
   * @property {Array} notifications - The list of unread notifications.
   * @property {number} totalCount - The total count of unread notifications.
   * @property {number} listLength - The current length of the unread notifications list.
   *
   */
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

  /**
   * @description
   * Lifecycle method called when the element is added to the DOM.
   * @returns {Promise<void>}
   */
  async connectedCallback() {
    const userData = await auth.getUser();
    if (!userData) {
      return;
    }
    this.#state.username = userData.username;
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

  /**
   * @description
   * Renders the notifications list component by setting its inner HTML.
   * It initializes the button and dropdown elements, sets up event listeners for rendering the list,
   * and handles the dropdown close event.
   */
  render() {
    this.innerHTML = this.style() + this.template();

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

  /**
   * @description
   * Renders the notifications list by fetching notifications from the API and updating the state.
   * It handles the case when there are no notifications by rendering a message indicating that.
   * It also updates the list length in the state.
   * @param {boolean} clearList - Whether to clear the list before rendering.
   * @returns {Promise<void>}
   * @listens shown.bs.dropdown
   */
  async renderList(clearList = true) {
    if (clearList) {
      this.clearList();
    }
    this.button?.querySelector('.notification-badge')?.classList.add('d-none');

    const read = this.#state.currentTab === 'unread' ? 'false' : 'all';
    const listData = this.#state.currentTab === 'unread' ? this.#unread : this.#all;
    const data = await this.fetchNotifications(read, 10, listData.listLength);
    if (!data) {
      this.list.innerHTML = this.noNotificationTemplate();
      const messageElement = this.querySelector('#unavailable-message');
      if (messageElement) {
        messageElement.innerText = 'Temporary unavailable';
      }
      this.markAllAsReadButton?.classList.add('d-none');
      return;
    }
    listData.totalCount = data.count;
    listData.notifications.push(...data.items);
    if (listData.notifications.length === 0) {
      this.list.innerHTML = this.noNotificationTemplate();
      this.markAllAsReadButton?.classList.add('d-none');
    }
    for (let i = listData.listLength; i < listData.notifications.length; i++) {
      const item = document.createElement('notifications-list-item');
      const data = {
        action: listData.notifications[i].action,
        data: listData.notifications[i].data,
        username: this.#state.username,
      };
      item.state = data;
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

  /**
   * @description
   * Fetches notifications from the API based on the read status, limit, and offset.
   * It returns the notifications data if the request is successful, or null if it fails.
   * @param {string} read - The read status of notifications (false (unread) or 'all').
   * @param {Number} limit - The maximum number of notifications to fetch.
   * @param {Number} offset - The offset for pagination.
   * @returns {Promise<Object|null>} - The notifications data or null if the request fails.
   */
  async fetchNotifications(read, limit, offset) {
    const response = await apiRequest(
      'GET',
      /* eslint-disable-next-line new-cap */
      API_ENDPOINTS.NOTIFICATIONS(read, limit, offset),
      null,
      false,
      true,
    );
    if (response.success) {
      return response.data;
    } else {
      return null;
    }
  }

  /**
   * @description
   * Toggles between the 'all' and 'unread' notifications tabs.
   * It updates the current tab state and re-renders the notifications list accordingly.
   * @param {Event} event - The click event triggered by the tab.
   * @returns {Promise<void>}
   * @listens click
   */
  async toggleTab(event) {
    event.preventDefault();
    event.stopPropagation();
    if (this.#state.isLoading) {
      return;
    }
    const clickedTab = event.target.id === 'unread-notifications-tab' ? 'unread' : 'all';
    if (clickedTab !== this.#state.currentTab) {
      this.#state.currentTab = clickedTab;
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
  }

  /**
   * @description
   * Loads more notifications when the user scrolls to the bottom of the dropdown.
   * It checks if the user has scrolled to the bottom and if there are more notifications to load.
   * If so, it fetches more notifications and updates the list.
   * If the total count of notifications is reached, it does not fetch more data.
   * @param {Event} event - The scroll event triggered by the dropdown.
   * @returns {Promise<void>}
   * @listens scrollend
   */
  async loadMoreNotifications(event) {
    const { scrollTop, scrollHeight, clientHeight } = event.target;
    const threshold = 5;
    const totalCount = this.#state.currentTab === 'unread' ? this.#unread.totalCount : this.#all.totalCount;
    const listLength = this.#state.currentTab === 'unread' ? this.#unread.listLength : this.#all.listLength;
    if (
      Math.ceil(scrollTop + clientHeight) < scrollHeight - threshold ||
      totalCount <= listLength ||
      this.#state.isLoading
    ) {
      return;
    }
    this.#state.isLoading = true;
    await this.renderList(false);
    this.#state.isLoading = false;
  }

  /**
   * @description
   * Marks a notification as read when it is clicked.
   * It sends a message to the server to mark the notification as read,
   * removes the click event listener from the notification item, and updates the notification list to reflect the change.
   * @param {Event} event - The click event triggered by the notification item.
   * @returns {void}
   * @listens click
   */
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
        },
      };
      socketManager.sendMessage('livechat', message);
      element.removeEventListener('click', this.readNotification);
      element.classList.remove('unread');
      this.resetList();
    }
  }

  /**
   * @description
   * Marks all notifications as read when the "Mark all as read" button is clicked.
   * It sends a request to the API to mark all notifications as read and re-renders the notifications list to reflect the change.
   * @param {Event} event - The click event triggered by the "Mark all as read" button.
   * @returns {Promise<void>}
   * @listens click
   */
  async markAllAsRead(event) {
    event.stopPropagation();
    event.preventDefault();

    const response = await apiRequest('POST', API_ENDPOINTS.NOTIDICATIONS_READ, null, false, true);
    if (!response.success) {
      return;
    }
    this.#state.isLoading = true;
    await this.renderList();
    this.#state.isLoading = false;
  }

  /**
   * @description
   * Prevents the notifications list from closing when clicked.
   * This is used to keep the dropdown open when interacting with the notifications list.
   * @param {Event} event - The click event triggered by the notifications list.
   * @returns {void}
   * @listens click
   */
  preventListClose(event) {
    event.stopPropagation();
    event.preventDefault();
  }

  /**
   * @description
   * Clears the notifications list by removing all notification items and resetting the unread and all notifications state.
   * It also removes the click event listeners from the notification items.
   * @returns {void}
   */
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

  /**
   * @description
   * Resets the notifications list by clearing the current tab and re-rendering the list.
   * It also updates the active tab to 'all' and resets the list length.
   * @returns {void}
   * @listens hidden.bs.dropdown
   */
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
      <p class="text-center m-0" id="unavailable-message">No notification</p>
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
