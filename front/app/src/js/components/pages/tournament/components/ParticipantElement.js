export class participantElement extends HTMLElement {
  #state = {
    participantData: null,
    score: '',
  };

  constructor() {
    super();
  }

  set data(data) {
    this.#state.participantData = data.participant;
    this.#state.score = data.score || '';
    console.log('Participant data set:', this.#state.participantData);
    this.render();
  }

  render() {
    this.innerHTML = this.template() + this.style();
    const avatarElement = this.querySelector('.player-avatar');
    const aliasElement = this.querySelector('.player-alias');
    const scoreElement = this.querySelector('.player-score');

    if (this.#state.participantData) {
      avatarElement.src = this.#state.participantData.profile.avatar;
      aliasElement.textContent = this.#state.participantData.alias;
      scoreElement.textContent = this.#state.score;
    }
    if (this.#state.score) {
      scoreElement.classList.remove('d-none');
    }
  }

  template() {
    return `
    <div class="bracket-player d-flex flex-row justify-content-center align-items-center p-2 gap-1">
      <img class="player-avatar avatar-xxs rounded-circle" alt="player avatar" />
      <p class="player-alias m-0"></div>
    </div>
    <p class="player-score text-end my-0 fw-bold d-none"></p>
    `;
  }

  style() {
    return `
    <style>
    .bracket-player {
      background-color: rgba(var(--bs-body-bg-rgb), 0.6);
      border-radius: .4rem;
      margin-bottom: .2rem;
    }      
    </style>
    `;
  }
}

customElements.define('participant-element', participantElement);
