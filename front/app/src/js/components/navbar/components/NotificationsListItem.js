import { router } from '@router';
import { socketManager } from '@socket';
import { getRelativeTime } from '@utils';
import { showToastNotification, TOAST_TYPES } from '@utils';

export class NotificationsListItem extends HTMLElement {
  #state = {
    username: '',
    action: '',
    data: null,
  };

  message = {
    gameInvitation: (nickname) => `${nickname} challenges you to a duel.`,
    pendingGameInvitation: (nickname) => `You've challenged ${nickname} to a duel.`,
    newTournament: (alias, tournamentName) =>
      `${alias} is calling all gunslingers to a new tournament - ${tournamentName}!`,
    newFriend: (nickname) => `${nickname} just roped you in as a friend.`,
  };

  constructor() {
    super();

    this.handleAcceptDuel = this.handleAcceptDuel.bind(this);
    this.handleDeclineDuel = this.handleDeclineDuel.bind(this);
    this.cancelDuelInvitation = this.cancelDuelInvitation.bind(this);
    this.handleParticipateTournament = this.handleParticipateTournament.bind(this);
    this.navigateToProfile = this.navigateToProfile.bind(this);
  }

  set state(data) {
    this.#state.action = data.action;
    this.#state.data = data.data;
    this.#state.username = data.username;
    this.render();
  }

  disconnectedCallback() {
    this.acceptButton?.removeEventListener('click', this.handleAcceptDuel);
    this.declineButton?.removeEventListener('click', this.handleDeclineDuel);
    this.cancelInviteButton?.removeEventListener('click', this.cancelDuelInvitation);
    this.seeProfileButton?.removeEventListener('click', this.navigateToProfile);
    if (this.#state.action === 'new_tournament') {
      this.removeEventListener('click', this.handleParticipateTournament);
    }
    if (this.#state.action === 'new_friend') {
      this.removeEventListener('click', this.navigateToProfile);
    }
  }

  render() {
    this.innerHTML = this.template();

    const avatar = this.querySelector('.notifications-list-avatar');
    avatar.src = this.#state.data.avatar;
    this.querySelector('.notification-time').textContent = getRelativeTime(this.#state.data.date);

    this.content = this.querySelector('.notification-content');
    this.buttonWrapper = this.querySelector('.call-to-action-groupe');
    switch (this.#state.action) {
      case 'game_invite':
        if (!this.#state.username) {
          this.content.textContent = 'This notification is momentarily unavailable.';
          return;
        }
        this.seeProfileButton = document.createElement('button');
        this.seeProfileButton.textContent = 'See profile';
        this.seeProfileButton.addEventListener('click', this.navigateToProfile);
        this.buttonWrapper.appendChild(this.seeProfileButton);
        if (this.#state.data.username !== this.#state.username) {
          this.content.textContent = this.message.gameInvitation(this.#state.data.nickname);
          this.acceptButton = document.createElement('button');
          this.acceptButton.textContent = 'Accept';
          this.acceptButton.addEventListener('click', this.handleAcceptDuel);
          this.declineButton = document.createElement('button');
          this.declineButton.textContent = 'Decline';
          this.declineButton.addEventListener('click', this.handleDeclineDuel);
          this.buttonWrapper.appendChild(this.acceptButton);
          this.buttonWrapper.appendChild(this.declineButton);
        } else {
          avatar.src = this.#state.data.invitee.avatar;
          this.content.textContent = this.message.pendingGameInvitation(this.#state.data.invitee.nickname);
          this.cancelInviteButton = document.createElement('button');
          this.cancelInviteButton.textContent = 'Cancel';
          this.cancelInviteButton.addEventListener('click', this.cancelDuelInvitation);
          this.buttonWrapper.appendChild(this.cancelInviteButton);
        }
        break;
      case 'new_tournament':
        this.querySelector('.notification-content').textContent = this.message.newTournament(
          this.#state.data.alias,
          this.#state.data.tournament_name,
        );
        this.participateButton = document.createElement('button');
        this.participateButton.textContent = 'Participate';
        this.addEventListener('click', this.handleParticipateTournament);
        this.buttonWrapper.appendChild(this.participateButton);
        break;
      case 'new_friend':
        this.querySelector('.notification-content').textContent = this.message.newFriend(this.#state.data.nickname);
        this.seeProfileButton = document.createElement('button');
        this.seeProfileButton.textContent = 'See profile';
        this.buttonWrapper.appendChild(this.seeProfileButton);
        this.addEventListener('click', this.navigateToProfile);
        break;
    }
  }

  replyGameInvite(accept) {
    const message = {
      action: 'reply_game_invite',
      data: {
        username: this.#state.data.username,
        accept: accept,
      },
    };
    socketManager.sendMessage('livechat', message);
    const dropdown = this.closest('.dropdown-menu');
    dropdown.classList.remove('show');
  }

  async handleAcceptDuel() {
    const currentPath = window.location.pathname;
    let duelPage;
    if (currentPath === '/duel') {
      duelPage = document.querySelector('duel-page');
      if (!duelPage) {
        return;
      }
      if (duelPage.status === 'starting') {
        showToastNotification('You are already in a duel. Cannot accept a new one.', TOAST_TYPES.ERROR);
        return;
      }
    }
    const confirmationFromServer = new Promise((resolve) => {
      document.addEventListener(
        'duelInvitationAccepted',
        (event) => {
          resolve(event.detail);
        },
        { once: true },
      );
      this.replyGameInvite(true);
    });
    const data = await confirmationFromServer;
    duelPage
      ? duelPage.handleInvitationAccepted(data)
      : router.navigate('/duel', {
          status: 'starting',
          gameId: data.game_id,
          username: data.username,
          nickname: data.nickname,
          avatar: data.avatar,
        });
  }

  handleDeclineDuel() {
    this.replyGameInvite(false);
  }

  cancelDuelInvitation() {
    const dropdown = this.closest('.dropdown-menu');
    dropdown.classList.remove('show');
    if (window.location.pathname === '/duel') {
      const duelPage = document.querySelector('duel-page');
      if (duelPage) {
        duelPage.cancelInvitation();
      } else {
        devErrorLog('Duel page not found');
      }
      return;
    }
    const message = {
      action: 'cancel_game_invite',
      data: {
        username: this.#state.data.invitee.username,
      },
    };
    socketManager.sendMessage('livechat', message);
  }

  handleParticipateTournament() {
    const dropdown = this.closest('.dropdown-menu');
    dropdown.classList.remove('show');
    router.navigate('/tournament-menu');
    requestAnimationFrame(() => {
      const tournamentPage = document.querySelector('tournament-menu');
      if (tournamentPage) {
        tournamentPage.showTournamentDetail(null, this.#state.data.tournament_id);
      } else {
        console.error('Tournament page not found');
      }
    });
  }

  navigateToProfile() {
    const dropdown = this.closest('.dropdown-menu');
    dropdown.classList.remove('show');
    router.navigate(`/profile/${this.#state.data.username}`);
  }

  template() {
    return `
	  <li class="list-group-item dropdown-list-item px-2 pt-4">
	    <div class="d-flex flex-column">
          <div class="d-flex flex-row justify-content-start align-items-start gap-4">
            <img class="notifications-list-avatar avatar-m rounded-circle" alt="Avatar"">
            <div class="d-flex flex-column justify-content-center">
              <p class="notification-content m-0 mb-1"></p>
              <p class="notification-time m-0"></P>
            </div>
            <i class="unread-badge bi bi-record-fill ms-auto"></i>
  	    </div>
        <div class="call-to-action-groupe d-flex flex-row justify-content-end align-items-center gap-3"></div>
	    </div>
	  </li>
    `;
  }
}

customElements.define('notifications-list-item', NotificationsListItem);
