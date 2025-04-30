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

    this.renderList = this.renderList.bind(this);
    this.filterTournament = this.filterTournament.bind(this);
  }

  connectedCallback() {
    this.render();
  }

  disconnectedCallback() {
    this.listWrapper?.removeEventListener('scrollend', this.renderList);
    this.filterButton?.removeEventListener('click', this.filterTournament);
    this.filterOpenButton?.removeEventListener('click', this.filterTournament);
    this.filterAllButton?.removeEventListener('click', this.filterTournament);
  }

  getTournamentById(id) {
    return this.#state.tournaments.find(item => item.tournament_id === id);
  }

  setNewTournament(tournament) {
    this.#state.tournaments.unshift(tournament);
    console.log('New tournament added:', tournament);
    this.#state.totalTournaments++;
    const item = this.renderRow(tournament);
    this.list.insertBefore(item, this.list.firstChild);
    this.#state.currentLastItemIndex++;
    this.filterButton.classList.remove('d-none');
    const noItem = this.list.querySelector('#no-open-tournaments');
    if (noItem) {
      this.list.removeChild(noItem);
    }
  }

  /* ------------------------------------------------------------------------ */
  /*      Render                                                              */
  /* ------------------------------------------------------------------------ */
  render() {
    this.innerHTML = this.template() + this.style();

    this.listWrapper = this.querySelector('#tournament-list-wrapper');
    this.list = this.querySelector('#tournament-list');
    this.filterButton = this.querySelector('#game-history-filter');
    this.filterOpenButton = this.querySelector('#tournament-filter-open');
    this.filterAllButton = this.querySelector('#tournament-filter-all');

    this.listWrapper?.addEventListener('scrollend', this.renderList);
    this.filterButton?.addEventListener('click', this.filterTournament);
    this.filterOpenButton?.addEventListener('click', this.filterTournament);
    this.filterAllButton?.addEventListener('click', this.filterTournament);
  
    this.renderList();
  }

  async renderList(event) {
    if (event) {
      // TODO: Handle scroll event
    }
    if (this.#state.isLoading ||
      (this.#state.totalTournaments > 0 && this.#state.tournaments.length === this.#state.totalTournaments)) {
      return;
    }
    this.#state.isLoading = true;
    await this.fetchTournamentList();
    // this.#state.tournaments = []; // TEST
    if (this.#state.tournaments.length === 0) {
      this.renderNoItem();
      this.#state.isLoading = false;
      return;
    }
    for (let i = this.#state.currentLastItemIndex; i < this.#state.tournaments.length; i++) {
      if (this.#state.filter === 'lobby' && this.#state.tournaments[i].status !== this.#state.filter) {
        continue;
      }
      const item = this.renderRow(this.#state.tournaments[i]);
      this.list.appendChild(item);
      ++this.#state.currentLastItemIndex;
    }
    if (this.#state.filter === 'lobby' && this.#state.currentLastItemIndex === 0) {
      this.renderNoItem();
    }
    this.#state.isLoading = false;
  }

  renderRow(tournament) {
    const item = document.createElement('li');
    item.className = 'list-group-item d-flex flex-row justify-content-between mb-2 p-4';
    item.innerHTML = this.rowTemplate();

    const tournamentName = item.querySelector('.tournament-name');
    const tournamentOrganizer = item.querySelector('.tournament-organizer');
    const tournamentOrganizerAvatar = item.querySelector('.tournament-organizer-avatar');
    const tournamentStatus = item.querySelector('.tournament-status');
    const tournamentParticipants = item.querySelector('.tournament-participants');
    tournamentName.textContent = tournament.tournament_name;
    tournamentOrganizer.textContent = 'by ' + tournament.creator.nickname;
    tournamentOrganizerAvatar.src = tournament.creator.avatar;
    tournamentOrganizerAvatar.alt = tournament.creator.nickname;
    tournamentStatus.textContent = this.tournamentStatus(tournament.status);
    tournamentParticipants.textContent = `${tournament.participants.length} / ${tournament.required_participants} players`;

    item.setAttribute('tournament-id', tournament.tournament_id);
    item.setAttribute('tournament-name', tournament.name);
    item.setAttribute('tournament-status', tournament.status);
    item.setAttribute('tournament-participants', tournament.participants.length);
    item.setAttribute('tournament-required-participants', tournament.required_participants);

    return item;
  }

  renderNoItem() {
    const item = document.createElement('li');
    item.className = 'list-group-item text-center border-0 bg-transparent py-3';
    item.id = 'no-open-tournaments';
    item.textContent = 'No tournaments available at the moment. Create a new one to get started.';
    this.list.appendChild(item);
    this.filterButton.classList.add('d-none');
  }
 
  /* ------------------------------------------------------------------------ */
  /*      Event handlers                                                      */
  /* ------------------------------------------------------------------------ */
  async fetchTournamentList() {
    // TEST
    const response = await mockTournamentList();
    this.#state.tournaments = response.items;
    this.#state.totalTournaments = response.count;

    // if (response.success) {
      // this.#state.tournaments = response.items;
    // }
  }

  filterTournament(event) {
    event.preventDefault();
    const target = event.target.closest('button');
    const filter = target?.getAttribute('filter');
    if (!filter || filter === this.#state.filter) {
      return;
    }
    this.#state.filter = filter;
    this.filterButton.textContent = target.textContent;
    this.#state.currentLastItemIndex = 0;
    this.#state.totalTournaments = 0;
    this.#state.tournaments = [];
    this.list.innerHTML = '';
    this.renderList();
  }

  /* ------------------------------------------------------------------------ */
  /*      Template & style                                                    */
  /* ------------------------------------------------------------------------ */
  template() {
    return `
    <div class="dropdown-toggle text-end mb-2" role="button" data-bs-toggle="dropdown" aria-haspopup="true" aria-expanded="false" id="game-history-filter">
      Open for entries
    </div>
    <div class="dropdown-menu dropdown-menu-end pt-2" aria-labelledby="game-history-filter">
      <button class="dropdown-item text-center" id="tournament-filter-open" filter="lobby">Open for entries</button>
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
    <div class="d-flex flex-row justify-content-start">
      <img class="tournament-organizer-avatar avatar-m rounded-circle me-3">
      <div class="d-flex flex-column justify-content-between">
        <p class="tournament-name fs-5 m-0"></p>
        <p class="tournament-organizer m-0"></p>
      </div>
    </div>
    <div class="d-flex flex-column justify-content-between align-items-end">
      <p class="tournament-status m-0"></p>
      <p class="tournament-participants m-0"></p>
    </div>
    `;
  }

  tournamentStatus(status) {
    const message = {
      lobby: 'Open for entries',
      ongoing: 'Ongoing',
      finished: 'Finished',
      cancelled: 'Cancelled',
    };
    return message[status] || 'Unknown';
  }
}

customElements.define('tournament-list', TournamentList);
