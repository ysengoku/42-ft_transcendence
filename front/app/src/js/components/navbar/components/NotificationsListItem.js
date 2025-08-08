/**
 * @module NotificationsListItem
 * @description
 * This module defines a custom notifications list item component for the navbar.
 * It handles the rendering of individual notifications, including game invitations, tournament announcements, and new friends.
 * It provides methods to accept or decline game invitations, cancel duel invitations,
 * participate in tournaments, and navigate to user profiles.
 */

import { router } from '@router';
import { socketManager } from '@socket';
import { getRelativeTime, showToastNotification, TOAST_TYPES } from '@utils';
import { DUEL_STATUS } from '@components/pages/match/Duel';

/**
 * @class NotificationsListItem
 * @extends HTMLElement
 */
export class NotificationsListItem extends HTMLElement {
  /**
   * Private state of the NotificationsListItem component.
   * @property {string} username - The username of the logged-in user.
   * @property {string} action - The type of notification action (game_invite, new_tournament, new_friend).
   * @property {Object} data - The data associated with the notification.
   */
  #state = {
    username: '',
    action: '',
    data: null,
  };

  /**
   * @description
   * Sets the state of the notification item.
   */
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

  /**
   * @description
   * Sets the state of the notification item and render the component.
   * @param {Object} data - The data to set in the state.
   * @returns {void}
   */
  set state(data) {
    this.#state.action = data.action;
    this.#state.data = data.data;
    this.#state.username = data.username;
    this.render();
  }

  /**
   * @description
   * Lifecycle method called when the element is removed from the DOM.
   * It removes event listeners to prevent memory leaks.
   * @returns {void}
   */
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

  /**
   * @description
   * Renders the notifications list item component by setting its inner HTML.
   * It initializes the avatar image, notification content, and call-to-action buttons based on the notification action.
   * It also sets up event listeners for the buttons to handle actions like accepting or declining game invitations,
   * canceling duel invitations, participating in tournaments, and navigating to user profiles
   * @returns {void}
   */
  render() {
    this.innerHTML = this.style() + this.template();

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
          if (this.#state.data.settings) {
            this.renderGameOptionTags();
          }
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

  /**
   * @description
   * Renders the game option tags based on the settings of the game invitation.
   * It creates tags for score to win, game speed, time limit, ranked status, and cool mode,
   * and appends them to the notification game options wrapper.
   * @returns {void}
   */
  renderGameOptionTags() {
    const optionsWrapper = this.querySelector('.notification-game-options');
    if (!optionsWrapper) {
      return;
    }
    const scoreToWin = document.createElement('div');
    scoreToWin.classList.add('game-options-tag', 'tag-notification');
    scoreToWin.textContent = `Score to win: ${this.#state.data.settings.score_to_win}`;
    optionsWrapper.appendChild(scoreToWin);
    const gameSpeed = document.createElement('div');
    gameSpeed.classList.add('game-options-tag', 'tag-notification');
    gameSpeed.textContent = `Game speed: ${this.#state.data.settings.game_speed}`;
    optionsWrapper.appendChild(gameSpeed);
    const timeLimit = document.createElement('div');
    timeLimit.classList.add('game-options-tag', 'tag-notification');
    timeLimit.textContent = `Time limit: ${this.#state.data.settings.time_limit}`;
    optionsWrapper.appendChild(timeLimit);
    const ranked = document.createElement('div');
    ranked.classList.add('game-options-tag', 'tag-notification');
    ranked.textContent = `${this.#state.data.settings.ranked ? 'Ranked' : 'Not ranked'}`;
    optionsWrapper.appendChild(ranked);
    const coolMode = document.createElement('div');
    coolMode.classList.add('game-options-tag', 'tag-notification');
    coolMode.textContent = `Buffs ${this.#state.data.settings.cool_mode ? 'enabled' : 'disabled'}`;
    optionsWrapper.appendChild(coolMode);
  }

  /**
   * @description
   * Replies to a game invite by sending a message to the server.
   * It constructs a message with the username and whether the invite is accepted or declined.
   * It also closes the dropdown menu after sending the message.
   * @param {boolean} accept - Whether to accept the game invite.
   * @returns {void}
   */
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

  /**
   * @description
   * Handles the accept duel action by sending a reply to the game invite.
   * It checks if the user is already in a duel page.
   * If so, cancels any staring game or ongoing invitation.
   * It waits for confirmation from the server before redirecting to the duel lobby.
   * If the user is not in duel lobby, it redirects there with the game ID and user details.
   * @param {Event} event - The click event triggered by the accept button.
   * @returns {void}
   * @listens click
   */
  async handleAcceptDuel() {
    const currentPath = window.location.pathname;
    let duelPage;
    if (currentPath === '/duel') {
      duelPage = document.querySelector('duel-page');
      if (!duelPage) {
        return;
      }
      if (duelPage.status === DUEL_STATUS.STARTING) {
        showToastNotification('You are already in a duel. Cannot accept a new one.', TOAST_TYPES.ERROR);
        return;
      }
      if (duelPage.status === DUEL_STATUS.INVITING) {
        duelPage.cancelInvitation();
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
    if (!duelPage) {
      router.redirect('/duel', {
        status: DUEL_STATUS.STARTING,
        gameId: data.game_id,
        username: data.username,
        nickname: data.nickname,
        avatar: data.avatar,
      });
    }
  }

  /**
   * @description
   * Handles the decline duel action by sending a reply to the game invite with a decline status.
   * @returns {void}
   * @listens click
   */
  handleDeclineDuel() {
    this.replyGameInvite(false);
  }

  /**
   * @description
   * If the user is inviter, it cancels the duel invitation by sending a message to the server.
   * @returns {void}
   * @listens click
   */
  cancelDuelInvitation() {
    const dropdown = this.closest('.dropdown-menu');
    dropdown.classList.remove('show');
    if (window.location.pathname === '/duel') {
      const duelPage = document.querySelector('duel-page');
      if (duelPage) {
        duelPage.cancelInvitation();
      } else {
        log.error('Duel page not found');
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

  /**
   * @description
   * Handles the participation in a tournament by navigating to the tournament menu.
   * It closes the dropdown menu and redirects to the tournament menu page.
   * It also shows the tournament detail if the tournament page is found.
   * @returns {void}
   * @listens click
   */
  handleParticipateTournament() {
    const dropdown = this.closest('.dropdown-menu');
    dropdown.classList.remove('show');
    router.navigate('/tournament-menu');
    requestAnimationFrame(() => {
      const tournamentPage = document.querySelector('tournament-menu');
      if (tournamentPage) {
        tournamentPage.showTournamentDetail(null, this.#state.data.tournament_id);
      } else {
        log.error('Tournament page not found');
      }
    });
  }

  /**
   * @description
   * Navigates to the user profile page of the notification's data.
   * It closes the dropdown menu and redirects to the user's profile page.
   * @returns {void}
   * @listens click
   */
  navigateToProfile() {
    const dropdown = this.closest('.dropdown-menu');
    dropdown.classList.remove('show');
    router.navigate(`/profile/${this.#state.data.username}`);
  }

  template() {
    return `
	  <li class="list-group-item dropdown-list-item px-2 pt-4 me-4">
	    <div class="d-flex flex-column">
          <div class="d-flex flex-row justify-content-start align-items-start gap-4">
            <img class="notifications-list-avatar avatar-m rounded-circle" alt="Avatar"">
            <div class="d-flex flex-column justify-content-center">
              <p class="notification-content m-0 mb-1"></p>
              <div class="notification-game-options d-flex flex-row flex-wrap mb-1 gap-1"></div>
              <p class="notification-time m-0"></P>
            </div>
            <i class="unread-badge bi bi-record-fill ms-auto"></i>
  	    </div>
        <div class="call-to-action-groupe d-flex flex-row justify-content-end align-items-center gap-3"></div>
	    </div>
	  </li>
    `;
  }

  style() {
    return `
    <style>
      .notification-content {
        white-space: pre-wrap;
      }
      .tag-notification {
        background-color: rgba(var(--bs-body-color-rgb), 0.1) !important;
        color: var(--bs-body-color) !important;
        font-size: 0.8rem;
      }
    </style>
    `;
  }
}

customElements.define('notifications-list-item', NotificationsListItem);
