import { router } from '@router';
import { getRelativeTime } from '@utils';

export class NotificationsListItem extends HTMLElement {
  #state = {
    action: '',
    data: null,
  };

  constructor() {
    super();

    this.handleAcceptDuel = this.handleAcceptDuel.bind(this);
    this.handleDeclineDuel = this.handleDeclineDuel.bind(this);
    this.handleParticipateTournament = this.handleParticipateTournament.bind(this);
    this.handleSeeProfile = this.handleSeeProfile.bind(this);
  }

  set data(data) {
    this.#state.action = data.action;
    this.#state.data = data.data;
    this.render();
  }

  disconnectedCallback() {
    this.acceptButton?.removeEventListener('click', this.handleAcceptDuel);
    this.declineButton?.removeEventListener('click', this.handleDeclineDuel);
  }

  render() {
    this.innerHTML = this.template();

    this.querySelector('.notifications-list-avatar').src = this.#state.data.avatar;
    this.querySelector('.notification-time').textContent = getRelativeTime(this.#state.data.date);

    this.content = this.querySelector('.notification-content');
    this.buttonWrapper = this.querySelector('.call-to-action-groupe');
    switch (this.#state.action) {
      case 'game_invite':
        this.content.textContent = `${this.#state.data.nickname} challenges you to a duel.`;

        this.acceptButton = document.createElement('button');
        this.acceptButton.textContent = 'Accept';
        this.acceptButton.addEventListener('click', this.handleAcceptDuel);
        this.declineButton = document.createElement('button');
        this.declineButton.textContent = 'Decline';
        this.declineButton.addEventListener('click', this.handleDeclineDuel);
        this.buttonWrapper.appendChild(this.acceptButton);
        this.buttonWrapper.appendChild(this.declineButton);
        break;

      case 'new_tournament':
        this.querySelector('.notification-content').textContent =
          `${this.#state.data.nickname} is calling all gunslingers to a new tournament - ${this.#state.data.tournament_name}!`;

        this.participateButton = document.createElement('button');
        this.participateButton.textContent = 'Participate';
        this.participateButton.addEventListener('click', this.handleParticipateTournament);
        this.buttonWrapper.appendChild(this.participateButton);
        break;

      case 'new_friend':
        this.querySelector('.notification-content').textContent = `${this.#state.data.nickname} just roped you in as a friend.`;
        this.seeProfileButton = document.createElement('button');
        this.seeProfileButton.textContent = 'See profile';
        this.seeProfileButton.addEventListener('click', this.handleSeeProfile);
        this.buttonWrapper.appendChild(this.seeProfileButton);
        break;
    }
  }

  handleAcceptDuel() {
    console.log('Duel accepted');
  }

  handleDeclineDuel() {
    console.log('Duel declined');
  }

  handleParticipateTournament() {
    console.log('Participating in tournament');
  }

  handleSeeProfile() {
    router.navigate(`/profile/${this.#state.content.username}`);
  }

  template() {
    return `
	<li class="list-group-item dropdown-list-item px-2 pt-4">
	  <div class="d-flex flex-column">
        <div class="d-flex flex-row justify-content-start align-items-start gap-4">
          <div class="dropdown-list-avatar-container">
            <img class="notifications-list-avatar avatar-m rounded-circle" alt="Avatar"">
          </div>
          <div class="d-flex flex-column justify-content-center">
            <p class="notification-content m-0 mb-1"></p>
            <p class="notification-time m-0"></P>
          </div>
	    </div>
      <div class="call-to-action-groupe d-flex flex-row justify-content-end align-items-center gap-3"></div>
	  </div>
	</li>
    `;
  }
}

customElements.define('notifications-list-item', NotificationsListItem);
