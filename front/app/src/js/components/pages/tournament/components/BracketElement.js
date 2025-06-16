export class BracketElement extends HTMLElement {
  #state = {
    bracket: null,
  };

  constructor() {
    super();
  }

  set data(data) {
    console.log('BracketElement data:', data);
    this.#state.bracket = data;
    this.render();
  }

  render() {
    this.innerHTML = this.template();
    this.bracketWrapper = this.querySelector('.bracket-wrapper');
    this.bracketWrapper.id = `bracket-${this.#state.bracket.game_id}`;

    const player1 = document.createElement('participant-element');
    player1.classList.add('bracket-player-1');
    const scoreP1 = this.#state.bracket.status === 'finished' ? this.#state.bracket.score_p1 : '';
    player1.data = {
      participant: this.#state.bracket.participant1,
      score: scoreP1,
    };
    const player2 = document.createElement('participant-element');
    player2.classList.add('bracket-player-2');
    const scoreP2 = this.#state.bracket.status === 'finished' ? this.#state.bracket.score_p2 : '';
    player2.data = {
      participant: this.#state.bracket.participant2,
      score: scoreP2,
    };
    if (this.#state.bracket.winner && this.#state.bracket.winner.profile) {
      this.#state.bracket.winner.profile.username === this.#state.bracket.participant1.profile.username
        ? (player1.classList.add('bracket-player-winner'), player2.classList.add('bracket-player-loser'))
        : (player1.classList.add('bracket-player-loser'), player2.classList.add('bracket-player-winner'));
    }
    this.bracketWrapper.appendChild(player1);
    this.bracketWrapper.appendChild(player2);
  }

  template() {
    return `
      <div class="bracket-wrapper d-flex flex-column align-items-start mx-2 mb-3 gap-1">
      </div>
    `;
  }
}

customElements.define('bracket-element', BracketElement);
