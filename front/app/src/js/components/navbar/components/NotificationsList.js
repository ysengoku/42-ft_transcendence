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
import { setupObserver } from '@utils';

/**
 * @class NotificationsList
 * @extends HTMLElement
 */
export class NotificationsList extends HTMLElement {
  /**
   * Private state of the NotificationsList component.
   * @property {'all'|'unread'} - The current tab being displayed ('all' or 'unread').
   * @property {boolean} isLoading - Indicates if the notifications are currently being loaded.
   * @property {string} username - The username of the logged-in user.
   * @property {{notifications: Array, totalCount: number, listLength: number}} currentTabListData - Reference to the data for selected tab
   */
  #state = {
    currentTab: 'all',
    isLoading: false,
    username: '',
    currentTabListData: {},
  };

  /**
   * Private state for unread/all notifications.
   * @property {Array<Object>} notifications - The list of unread/all notifications.
   * @property {number} totalCount - The total count of unread/all notifications.
   * @property {number} listLength - The current length of the unread/all notifications list.
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

  /**
   * @property {number} pagenationLimit - The limit of items to fetch at one request
   * @property {IntersectionObserver|null} observer - The IntersectionObserver instance for lazy loading.
   * @property {HTMLElement|null} loadMoreAnchor - The anchor element for loading more items.
   */
  #pagenationLimit = 10;
  observer = null;
  loadMoreAnchor = null;

  constructor() {
    super();

    this.renderListContent = this.renderListContent.bind(this);
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
  connectedCallback() {
    this.#state.username = auth.getStoredUser()?.username || '';
    this.render();
  }

  disconnectedCallback() {
    this.cleanObserver();
    this.button?.removeEventListener('shown.bs.dropdown', this.renderListContent);
    this.button?.removeEventListener('hidden.bs.dropdown', this.resetList);
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

    this.dropdown?.addEventListener('click', this.preventListClose);
    this.button?.addEventListener('shown.bs.dropdown', this.renderListContent);
    this.button?.addEventListener('hidden.bs.dropdown', this.resetList);
    this.allTab?.addEventListener('click', this.toggleTab);
    this.unreadTab?.addEventListener('click', this.toggleTab);
    this.markAllAsReadButton?.addEventListener('click', this.markAllAsRead);
  }

  /* ------------------------------------------------------------------------ */
  /*     Event handlers                                                       */
  /* ------------------------------------------------------------------------ */

  async renderListContent() {
    this.button?.querySelector('.notification-badge')?.classList.add('d-none');

    this.#state.currentTabListData = this.#state.currentTab === 'unread' ? this.#unread : this.#all;
    const fetchedData = await this.fetchNotifications();
    this.renderList(fetchedData);

    this.cleanObserver();
    [this.observer, this.loadMoreAnchor] = setupObserver(this.list, this.loadMoreNotifications);
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
  async renderList(fetchedData, clearList = true) {
    if (clearList) {
      this.clearList();
    }
    if (!fetchedData) {
      this.list.innerHTML = this.noNotificationTemplate();
      const messageElement = this.querySelector('#notifications-unavailable-message');
      if (messageElement) {
        messageElement.innerText = 'Temporary unavailable';
      }
      this.markAllAsReadButton?.classList.add('d-none');
      return;
    }
    this.#state.currentTabListData.totalCount = fetchedData.count;
    this.#state.currentTabListData.notifications.push(...fetchedData.items);
    if (this.#state.currentTabListData.notifications.length === 0) {
      this.list.innerHTML = this.noNotificationTemplate();
      this.markAllAsReadButton?.classList.add('d-none');
    }
    for (
      let i = this.#state.currentTabListData.listLength;
      i < this.#state.currentTabListData.notifications.length;
      i++
    ) {
      const item = document.createElement('notifications-list-item');
      const data = {
        action: this.#state.currentTabListData.notifications[i].action,
        data: this.#state.currentTabListData.notifications[i].data,
        username: this.#state.username,
      };
      item.state = data;
      if (i === 0) {
        item.querySelector('.dropdown-list-item').classList.add('border-top-0');
      }
      if (!this.#state.currentTabListData.notifications[i].is_read) {
        item.addEventListener('click', this.readNotification);
        item.id = `notification-${this.#state.currentTabListData.notifications[i].id}`;
        item.classList.add('unread');
      }
      this.list.appendChild(item);
      this.#state.currentTabListData.listLength++;
    }
  }

  cleanObserver() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    if (this.loadMoreAnchor) {
      this.loadMoreAnchor.parentNode?.removeChild(this.loadMoreAnchor);
      this.loadMoreAnchor = null;
    }
  }

  /**
   * @description
   * Fetches notifications from the API based on the read status, limit, and offset.
   * It returns the notifications data if the request is successful, or null if it fails.
   * @param {string} read - The read status of notifications (false (unread) or 'all').
   * @param {Number} limit - The maximum number of notifications to fetch.
   * @param {Number} offset - The offset for pagination.
   * @returns {Promise<Object|null>} - The notifications data or null if the request fails.
   */
  async fetchNotifications() {
    const read = this.#state.currentTab === 'unread' ? 'false' : 'all';
    const offset = this.#state.currentTabListData.notifications.length;
    const response = await apiRequest(
      'GET',
      /* eslint-disable-next-line new-cap */
      API_ENDPOINTS.NOTIFICATIONS(read, this.#pagenationLimit, offset),
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
      this.#state.currentTabListData = this.#state.currentTab === 'unread' ? this.#unread : this.#all;
      const fetchedData = await this.fetchNotifications();
      this.renderList(fetchedData);
      this.#state.isLoading = false;
      this.observer.unobserve(this.loadMoreAnchor);
      this.list.appendChild(this.loadMoreAnchor);
      this.observer.observe(this.loadMoreAnchor);
    }
  }

  /**
   * @description
   * Handles the IntersectionObserver entries to load more items when the user scrolls to the bottom of the list.
   * It checks if the total count is greater than the current list length.
   * If so, it fetches more data and appends the list items.
   * If the observer is not intersecting or if the state is already loading, it returns early.
   * It also resets the observer and anchor element after loading more users.
   * @param {IntersectionObserverEntry[]} entries - The entries from the IntersectionObserver.
   * @returns {Promise<void>}
   * @listens intersectionobserver
   */

  async loadMoreNotifications(entries) {
    const entry = entries[0];
    const totalCount = this.#state.currentTab === 'unread' ? this.#unread.totalCount : this.#all.totalCount;
    const listLength = this.#state.currentTab === 'unread' ? this.#unread.listLength : this.#all.listLength;
    if (!entry.isIntersecting || totalCount <= listLength || this.#state.isLoading) {
      return;
    }
    this.#state.isLoading = true;
    const fetchedData = await this.fetchNotifications();
    if (fetchedData) {
      this.renderList(fetchedData, false);
    }
    this.#state.isLoading = false;
    this.observer.unobserve(this.loadMoreAnchor);
    this.list.appendChild(this.loadMoreAnchor);
    this.observer.observe(this.loadMoreAnchor);
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
    this.cleanObserver();
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
      max-height: calc(75vh - 10rem);
      max-width: 480px;
      overflow-y: auto;
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
    #notifications-unavailable-message {
      min-width: 25vw;
    }
    </style>
    <div class="list-group-item p-3">
      <p class="text-center m-0" id="notifications-unavailable-message">No notification</p>
    </div>
    `;
  }
}

customElements.define('notifications-list', NotificationsList);
