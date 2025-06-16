/**
 * @module TournamentPending
 * @description Component for displaying the pending state of a tournament.
 * It shows the current participants, allows the creator to cancel the tournament,
 * and allows participants to unregister from the tournament.
 */

import { router } from '@router';
import { apiRequest, API_ENDPOINTS } from '@api';
import { showAlertMessageForDuration, ALERT_TYPE } from '@utils';

export class TournamentPending extends HTMLElement {
  /**
   * Private state of the component.
   * @property {string} id - The ID of the tournament.
   * @property {number} requiredParticipants - The number of participants required for the tournament.
   * @property {Array} participants - The list of participants currently registered for the tournament.
   * @property {string} creatorUsername - The username of the tournament creator.
   * @property {string} loggedInUsername - The username of the currently logged-in user.
   */
  #state = {
    id: '',
    requiredParticipants: 0,
    participants: [],
    creatorUsername: '',
    loggedInUsername: '',
  };

  constructor() {
    super();

    this.currentParticipantsCount = null;
    this.requiredParticipants = null;
    this.participantsWrapper = null;
    this.cancelTournamentButton = null;
    this.unregisterButton = null;
    this.modalElement = null;

    this.handleUnregisterButtonClick = this.handleUnregisterButtonClick.bind(this);
    this.handleCancelTournamentButtonClick = this.handleCancelTournamentButtonClick.bind(this);
    this.handleConfirmationFromModal = this.handleConfirmationFromModal.bind(this);
  }

  set data(data) {
    this.#state.id = data.id;
    this.#state.requiredParticipants = data.required_participants;
    this.#state.participants = data.participants;
    this.#state.creatorUsername = data.creatorUsername;
    this.#state.loggedInUsername = data.loggedInUsername;
  }

  connectedCallback() {
    this.render();
  }

  disconnectedCallback() {
    this.unregisterButton?.removeEventListener('click', this.handleUnregisterButtonClick);
    this.cancelTournamentButton?.removeEventListener('click', this.handleCancelTournamentButtonClick);
    this.currentParticipantsCount = null;
  }

  /* ------------------------------------------------------------------------ */
  /*      Render                                                              */
  /* ------------------------------------------------------------------------ */
  render() {
    this.innerHTML = this.template() + this.style();

    this.currentParticipantsCount = this.querySelector('#current-participants-count');
    this.requiredParticipants = this.querySelector('#required-participants');
    this.participantsWrapper = this.querySelector('#participants-wrapper');
    this.cancelTournamentButton = this.querySelector('#cancel-tournament-button');
    this.unregisterButton = this.querySelector('#cancel-registration-button');
    this.modalElement = document.querySelector('tournament-modal');

    this.currentParticipantsCount.textContent = `${this.#state.participants.length}`;
    this.requiredParticipants.textContent = ` / ${this.#state.requiredParticipants}`;
    this.#state.participants.forEach((participant) => {
      this.renderParticipant(participant);
    });
    if (this.#state.creatorUsername === this.#state.loggedInUsername) {
      this.cancelTournamentButton.classList.remove('d-none');
      this.cancelTournamentButton.addEventListener('click', this.handleCancelTournamentButtonClick);
    }
    this.unregisterButton.addEventListener('click', this.handleUnregisterButtonClick);
  }

  renderParticipant(data) {
    if (this.participantsWrapper.querySelector(`#participant-${data.alias}`)) {
      return;
    }
    // Create a new participant element and append it
    if (!data.profile) {
      data.profile = {};
      data.profile.avatar = data.avatar;
    }
    const participant = document.createElement('div');
    participant.innerHTML = this.participantTemplate();
    const avatarElement = participant.querySelector('.participant-avatar');
    const aliasElement = participant.querySelector('.participant-alias');
    avatarElement.src = data.profile.avatar;
    aliasElement.textContent = data.alias;
    participant.id = `participant-${data.alias}`;
    this.participantsWrapper.appendChild(participant);
  }

  /**
   * @param {Object} data - The participant data containing alias and profile information.
   * @property {string} data.alias - The alias of the participant.
   * @property {Object} data.profile - The profile information of the participant.
   * @property {string} data.profile.avatar - The URL of the participant's avatar.
   * @description If the participant already exists, it does nothing.
   * It creates a new participant element, sets its avatar and alias, and appends it to the participants wrapper.
   * It also updates the participants count and shows/hides buttons based on the number of participants.
   */
  addParticipant(data) {
    this.renderParticipant(data);
    this.#state.participants.push(data);

    // Update the participants count
    this.currentParticipantsCount.textContent = `${this.#state.participants.length}`;
    if (this.#state.participants.length === this.#state.requiredParticipants) {
      this.unregisterButton.classList.add('d-none');
      this.cancelTournamentButton.classList.remove('d-none');
    }
  }

  /**
   * @param {Object} data - The participant data containing alias and profile information.
   * @property {string} data.alias - The alias of the participant.
   * @property {Object} data.profile - The profile information of the participant.
   * @property {string} data.profile.avatar - The URL of the participant's avatar.
   * @description Removes a participant from the tournament.
   * It finds the participant element by its alias, removes it from the DOM,
   * and updates the participants count.
   */
  removeParticipant(data) {
    const escapedAlias = CSS.escape(data.alias);
    const participant = this.participantsWrapper.querySelector(`#participant-${escapedAlias}`);
    if (participant) {
      this.participantsWrapper.removeChild(participant);
    }
    const participantData = this.#state.participants.find((p) => p.alias === data.alias);
    if (participantData) {
      this.#state.participants.splice(this.#state.participants.indexOf(participantData), 1);
    }
    this.currentParticipantsCount.textContent = `${this.#state.participants.length}`;
  }

  /* ------------------------------------------------------------------------ */
  /*      Events handling                                                     */
  /* ------------------------------------------------------------------------ */
  
  /**
   * @description Handles the click event on the unregister button.
   * It shows a modal to confirm the unregistration from the tournament.
   * It listens for 'tournament-modal-confirm' event from the modal to proceed with the unregistration.
   */
  handleUnregisterButtonClick() {
    this.modalElement.contentType = this.modalElement.CONTENT_TYPE.UNREGISTER_TOURNAMENT;
    this.modalElement.showModal();
    document.addEventListener('tournament-modal-confirm', this.handleConfirmationFromModal);
  }

  /**
   * @description Unregisters the user from the tournament.
   * It sends a DELETE request to the API endpoint to unregister the user.
   * If the request is successful, it clears the inner HTML of the component,
   * and displays a message indicating that the user has unregistered.
   * If the request fails, it shows an error alert message.
   */
  async unregisterTournament() {
    const response = await apiRequest(
      'DELETE',
      /* eslint-disable-next-line new-cap */
      API_ENDPOINTS.TOURNAMENT_UNREGISTER(this.#state.id),
      null,
      false,
      true,
    );
    if (!response.success) {
      showAlertMessageForDuration(ALERT_TYPE.ERROR, response.msg);
      return;
    }
    this.unregisterButton?.removeEventListener('click', this.handleUnregisterButtonClick);
    this.cancelTournamentButton?.removeEventListener('click', this.handleCancelTournamentButtonClick);
    this.innerHTML = '';
    this.innerHTML = this.unresigteredTemplate();
    const goToHomeButton = this.querySelector('#go-to-home-button');
    const goToTournamentMenuButton = this.querySelector('#go-to-tournament-menu-button');
    goToHomeButton.addEventListener(
      'click',
      () => {
        router.redirect('/home');
      },
      { once: true },
    );
    goToTournamentMenuButton.addEventListener(
      'click',
      () => {
        router.redirect('/tournament-menu');
      },
      { once: true },
    );
  }

  /**
   * @description Handles the click event on the cancel tournament button.
   * It shows a modal to confirm the cancellation of the tournament.
   * It listens for 'tournament-modal-confirm' event from the modal to proceed with the cancellation.
   */
  handleCancelTournamentButtonClick() {
    this.modalElement.contentType = this.modalElement.CONTENT_TYPE.CANCEL_TOURNAMENT;
    this.modalElement.showModal();
    document.addEventListener('tournament-modal-confirm', this.handleConfirmationFromModal);
  }

  /**
   * @description Handles the confirmation event from the modal.
   * It checks the content type of the modal (CANCEL_TOURNAMENT or UNREGISTER_TOURNAMENT),
   * and performs the appropriate action.
   */
  handleConfirmationFromModal(event) {
    const type = event.detail.contentType;
    document.removeEventListener('tournament-modal-confirm', this.handleConfirmationFromModal);
    if (type === this.modalElement.CONTENT_TYPE.CANCEL_TOURNAMENT) {
      const tournamentPageElement = document.querySelector('tournament-room');
      if (tournamentPageElement) {
        tournamentPageElement.cancelTournament();
      }
      return;
    }
    if (type === this.modalElement.CONTENT_TYPE.UNREGISTER_TOURNAMENT) {
      this.unregisterTournament();
      return;
    }
  }

  /* ------------------------------------------------------------------------ */
  /*      Template & style                                                    */
  /* ------------------------------------------------------------------------ */
  template() {
    return `
    <div class="d-flex flex-column justify-content-center align-items-center mt-3">
      <tournament-modal></tournament-modal>
      <p class="text-center m-1">Gathering Gunslingers...</p>
      <div class="d-flex flex-row justify-content-center align-items-center mb-5">
        <p class="m-0 pe-1 fs-2" id="current-participants-count"></p>
        <p class="m-0 fs-4" id="required-participants"></p>
      </div>
      <p class="text-center mt-4 mb-2 fs-5 fw-bold">Gunslingers in the Arena</p>
      <div class="d-flex flex-row flex-wrap justify-content-center w-75" id="participants-wrapper"></div>
      <div class="d-flex flex-row justify-content-center align-items-center mt-5 mb-2 gap-3">
        <div class="btn d-none" id="cancel-tournament-button">Call off the tournament</div>
        <div class="btn" id="cancel-registration-button">Unregister from the tournament</div>
      </div>
    </div>
    `;
  }

  style() {
    return `
    <style>
    #current-participants-count,
    #required-participants {
      font-family: 'van dyke', serif;
    }
    #cancel-tournament-button,
    #cancel-registration-button {
	    color: var(--pm-text-danger);
    }
    </style>
    `;
  }

  participantTemplate() {
    return `
    <div class="d-flex flex-row justify-content-center align-items-center mx-4 my-2 gap-2">
      <img class="participant-avatar avatar-xxs rounded-circle" src="/img/default_avatar.png" />
      <p class="participant-alias m-0 fs-5"></p>
    </div>
    `;
  }

  unresigteredTemplate() {
    return `
    <div class="d-flex flex-column justify-content-center align-items-center mt-3">
	    <p class="fs-4">You've backed out of this tournament.</p>
      <div class="d-flex flex-row justify-content-center align-items-center mt-5 mb-2 gap-3">
        <div class="btn" id="go-to-home-button">Back to Saloon</div>
        <div class="btn" id="go-to-tournament-menu-button">Find another tournament</div>
      </div>
    </div>
    `;
  }
}

customElements.define('tournament-pending', TournamentPending);
