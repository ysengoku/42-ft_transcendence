export class TournamentWaiting extends HTMLElement {
  #state = {
    requiredParticipants: 0,
    participants: [],
  }

  constructor() {
    super();

    this.currentParticipantsCount = null;
    this.requiredParticipants = null;
    this.participantsWrapper = null;
  }

  set data(data) {
    this.#state.requiredParticipants = data.required_participants;
    this.#state.participants = data.participants;
    this.render();
  }

  render() {
    this.innerHTML = this.template() + this.style();

    this.currentParticipantsCount = this.querySelector('#current-participants-count');
    this.requiredParticipants = this.querySelector('#required-participants');
    this.participantsWrapper = this.querySelector('#participants-wrapper');

    this.#state.requiredParticipants = 8; // For test
    this.currentParticipantsCount.textContent = `${this.#state.participants.length}`;
    this.requiredParticipants.textContent = ` / ${this.#state.requiredParticipants}`;

    this.#state.participants.forEach((participant) => {
      this.addParticipant(participant);
    });
  }

  addParticipant(data) {
    // TODO: listen websocket message new_registration
    const participant = document.createElement('div');
    participant.innerHTML = this.participantTemplate();

	const avatarElement = participant.querySelector('.participant-avatar');
    const aliasElement = participant.querySelector('.participant-alias');
	avatarElement.src = data.user.avatar;
    aliasElement.textContent = data.alias;

    this.participantsWrapper.appendChild(participant);
  }

  template() {
    return `
    <div class="d-flex flex-column justify-content-center mt-3">
      <p class="text-center m-1">Gathering Gunslingers...</p>
      <div class="d-flex flex-row justify-content-center align-items-center mb-2">
        <p class="m-0 pe-1 fs-2" id="current-participants-count"></p>
        <p class="m-0 fs-4" id="required-participants"></p>
      </div>
      <p class="text-center mt-4 mb-2 fs-4 fw-bold">Gunslingers in the Arena</p>
      <div class="d-flex flex-row flex-wrap justify-content-center px-4" id="participants-wrapper"></div>
      <div class="btn mt-4" id="cancel-registration-button">Cancel registration</div>
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
    .sheriff {
      width: 20px;
      height: 20px;
    }
    #cancel-registration-button {
	  color: rgba(var(--bs-body-color-rgb), 0.7)
    }
    </style>
    `;
  }

  participantTemplate() {
    return `
    <div class="d-flex flex-row justify-content-center align-items-center mx-4 my-2 gap-2">
      <img class="participant-avatar avatar-xs rounded-circle" src="/img/default_avatar.png" />
      <p class="participant-alias m-0"></p>
    </div>
    `;
  }
}

customElements.define('tournament-waiting', TournamentWaiting);
