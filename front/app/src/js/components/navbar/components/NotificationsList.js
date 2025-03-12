export class NotificationsList extends HTMLElement {
  #state = {
    notifications: [],
  };

  constructor() {
    super();
  }

  connectedCallback() {
    this.render();
  }

  render() {
    this.innerHTML = this.template() + this.style();

    this.list = this.querySelector('#notifications-list');

    this.button = document.getElementById('navbar-notifications-button');

    // Test
    this.button?.addEventListener('shown.bs.dropdown', () => {
      const listItem = document.createElement('li');
      listItem.classList.add('list-group-item');
      listItem.classList.add('dropdown-list-item');
      listItem.innerHTML = this.notificationListTemplate();
      this.list.appendChild(listItem);
    });
  }

  template() {
    return `
    <div class="ps-3 pe-4">
      <h6 class="pt-2 pb-4 dropdown-list-header" sticky>Notifications</h6>
      <ul class="list-group mb-2" id="notifications-list"></ul>
    </div>
    `;
  }

  style() {
    return `
    <style>
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

  // Test content
  notificationListTemplate() {
    return `
	<div class="d-flex flex-column">
      <div class="d-flex flex-row justify-content-center align-items-center">
        <div class="dropdown-list-avatar-container">
          <img class="notifications-list-avatar rounded-circle me-1" alt="Avatar" src="img/default_avatar.png">
            <span class="user-list-status-indicator ${this.#state.online ? 'online' : ''} ms-3"></span>
        </div>
        <div class="d-flex flex-column justify-content-center">
          <p class="notification-time m-0">2 hours ago</P>
          <p class="notification-content fs-5">Lifeenjoyer challenges you to a duel.</p>
        </div>
	  </div>
      <div class="call-to-action-groupe d-flex flex-row justify-content-end align-items-center mt-1 gap-3">
        <button>Accept</button>
        <button>Decline</button>
      </div>
	</div>
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
