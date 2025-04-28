import { mockTournamentList } from '@mock/functions/mockTournamentListData.js';

export class TournamentList extends HTMLElement {
  #state = {
    tournaments: [],
    filter: 'lobby',
    totalTournaments: 0,
    currentLastItemIndex: 0,
    isLoading: false,
  };

  constructor() {
    super();
  }

  connectedCallback() {
    this.render();
  }

  async fetchTournamentList() {
    // For test
    const response = await mockTournamentList();
    this.#state.tournaments = response.items;
    this.#state.totalTournaments = response.count;

    // if (response.success) {
      // this.#state.tournaments = response.items;
    // }
  }

  render() {
    this.innerHTML = this.template() + this.style();

    this.list = this.querySelector('#tournament-list');
    this.renderList();
  }

  async renderList(event) {
    if (event) {

    }
    if (this.#state.isLoading ||
      (this.#state.totalTournaments > 0 && this.#state.tournaments.length === this.#state.totalTournaments)) {
      return;
    }
    this.#state.isLoading = true;
    await this.fetchTournamentList();
    if (this.#state.tournaments.length === 0) {
      const item = document.createElement('li');
      item.className = 'list-group-item text-center border-0';
      item.textContent = 'No tournaments available';
      this.list.appendChild(item);
      return;
    }
    for (let i = this.#state.currentLastItemIndex; i < this.#state.tournaments.length; i++) {
      console.log('TournamentList', i, this.#state.tournaments[i]);
      if (this.#state.tournaments[i].status !== this.#state.filter) {
        continue;
      }
      const item = document.createElement('li');
      item.innerHTML = this.rowTemplate();

      const tournament = this.#state.tournaments[i];
      console.log('Tournament content', tournament);
      const tournamentName = item.querySelector('.tournament-name');
      const tournamentOrganizer = item.querySelector('.tournament-organizer');
      const tournamentOrganizerAvatar = item.querySelector('.tournament-organizer-avatar');
      const tournamentStatus = item.querySelector('.tournament-status');
      const tournamentParticipants = item.querySelector('.tournament-participants');
      tournamentName.textContent = tournament.name;
      tournamentOrganizer.textContent = 'by ' + tournament.creator.user.nickname;
      tournamentOrganizerAvatar.src = tournament.creator.user.avatar;
      tournamentOrganizerAvatar.alt = tournament.creator.user.nickname;
      tournamentStatus.textContent = this.tournamentStatus(tournament.status);
      tournamentParticipants.textContent = `${tournament.participants.length} / ${tournament.required_participants} players`;

      this.list.appendChild(item);
      ++this.#state.currentLastItemIndex;
    }
    this.#state.isLoading = false;
  }

  template() {
    return `
    <div class="dropdown-toggle text-end mb-2" role="button" data-bs-toggle="dropdown" aria-haspopup="true" aria-expanded="false" id="game-history-filter">
      Open for entries
    </div>
    <div class="dropdown-menu dropdown-menu-end pt-2" aria-labelledby="game-history-filter">
      <button class="dropdown-item text-center" id="tournament-filter-open">Open for entries</button>
      <button class="dropdown-item text-center" id="tournament-filter-all" filter="all">All tournaments</button>
    </div>

    <div class="overflow-auto" id="tournament-list-wrapper">
      <ul class="list-group" id="tournament-list"></ul>
    </div>
    `;
  }

  style() {
    return `
    <style>
    #tournament-list-wrapper {
      max-height: 400px;
      overflow-y: auto;
    }
    .list-group-item {
      background-color: rgba(var(--bs-body-bg-rgb), 0.6);
      border-radius: 0.5rem !important;
      border: 0 !important;
    }

    .tournament-status {
      font-size: 0.9rem !important;
    }
    </style>`;
  }

  rowTemplate() {
    return `
    <li class="list-group-item d-flex flex-row justify-content-between align-items-center mb-2 py-3">
      <div class="d-flex flex-row justify-content-start align-items-start h-100">
        <img class="tournament-organizer-avatar avatar-m rounded-circle me-3">
        <div class="d-flex flex-column">
          <p class="tournament-name fs-5 m-0"></p>
          <p class="tournament-organizer m-0"></p>
        </div>
      </div>
      <div class="d-flex flex-column">
        <p class="tournament-status m-0"></p>
        <p class="tournament-participants m-0"></p>
      </div>
    </li>
    `;
  }

  tournamentStatus(status) {
    const message = {
      lobby: 'Open for entries',
      in_progress: 'In progress',
      finished: 'Finished',
    };
    return message[status] || 'Unknown';
  }
}

customElements.define('tournament-list', TournamentList);
