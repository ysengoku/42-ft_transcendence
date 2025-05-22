import { router } from '@router';
import { apiRequest, API_ENDPOINTS } from '@api';
import { showAlertMessageForDuration, ALERT_TYPE } from '@utils';

export class TournamentPending extends HTMLElement {
  #state = {
    id: '',
    requiredParticipants: 0,
    participants: [],
  };

  constructor() {
    super();

    this.currentParticipantsCount = null;
    this.requiredParticipants = null;
    this.participantsWrapper = null;
    this.unregisterButton = null;

    this.unregisterTournament = this.unregisterTournament.bind(this);
  }

  set data(data) {
    this.#state.id = data.id;
    this.#state.requiredParticipants = data.required_participants;
    this.#state.participants = data.participants;
    this.render();
  }

  disconnectedCallback() {
    this.unregisterButton?.removeEventListener('click', this.unregisterTournament);
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
    this.unregisterButton = this.querySelector('#cancel-registration-button');

    this.currentParticipantsCount.textContent = `${this.#state.participants.length}`;
    this.requiredParticipants.textContent = ` / ${this.#state.requiredParticipants}`;

    this.#state.participants.forEach((participant) => {
      this.addParticipant(participant);
    });

    this.unregisterButton.addEventListener('click', this.unregisterTournament);
  }

  /* ------------------------------------------------------------------------ */
  /*      Event handling                                                      */
  /* ------------------------------------------------------------------------ */
  // ws new_registration listener
  addParticipant(data) {
    const participant = document.createElement('div');
    participant.innerHTML = this.participantTemplate();

    const avatarElement = participant.querySelector('.participant-avatar');
    const aliasElement = participant.querySelector('.participant-alias');
    avatarElement.src = data.profile.avatar;
    aliasElement.textContent = data.alias;
    participant.id = `participant-${data.alias}`;

    this.participantsWrapper.appendChild(participant);
  }

  // ws registration_canceled listener
  removeParticipant(data) {
    const participant = this.participantsWrapper.querySelector(`#participant-${data.alias}`);
    if (participant) {
      this.participantsWrapper.removeChild(participant);
    }
    const participantData = this.#state.participants.find((p) => p.alias === data.alias);
    if (participantData) {
      this.#state.participants.splice(this.#state.participants.indexOf(participantData), 1);
    }
  }

  async unregisterTournament() {
    const response = await apiRequest(
        'DELETE',
        /* eslint-disable-next-line new-cap */
        API_ENDPOINTS.TOURNAMENT_UNREGISTER(this.#state.id),
        null, false, true,
    );
    if (!response.success) {
      if (response.status === 403) {
        showAlertMessageForDuration(ALERT_TYPE.ERROR, response.msg);
        return;
      }
    }
    showAlertMessageForDuration(ALERT_TYPE.SUCCESS, 'Unregistered from tournament successfully.');
    setTimeout(() => {
      router.navigate('/home');
    }, 3000);
  }

  /* ------------------------------------------------------------------------ */
  /*      Template & style                                                    */
  /* ------------------------------------------------------------------------ */

  template() {
    return `
    <div class="d-flex flex-column justify-content-center align-items-center mt-3">
      <p class="text-center m-1">Gathering Gunslingers...</p>
      <div class="d-flex flex-row justify-content-center align-items-center mb-5">
        <p class="m-0 pe-1 fs-2" id="current-participants-count"></p>
        <p class="m-0 fs-4" id="required-participants"></p>
      </div>
      <p class="text-center mt-4 mb-2 fs-5 fw-bold">Gunslingers in the Arena</p>
      <div class="d-flex flex-row flex-wrap justify-content-center w-75" id="participants-wrapper"></div>
      <div class="btn mt-5" id="cancel-registration-button">Cancel registration</div>
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
}

customElements.define('tournament-pending', TournamentPending);
