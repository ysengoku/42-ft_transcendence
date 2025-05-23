import { apiRequest, API_ENDPOINTS } from '@api';
// import { mockTournamentList } from '@mock/functions/mockTournamentListData.js'; // For Test

export class TournamentList extends HTMLElement {
  #state = {
    tournaments: [],
    filter: 'pending',
    totalTournaments: 0,
    currentLastItemIndex: 0,
    isLoading: false,
  };

  constructor() {
    super();

    this.listWrapper = null;
    this.list = null;
    this.filterButton = null;
    this.filterOpenButton = null;
    this.filterAllButton = null;

    this.renderList = this.renderList.bind(this);
    this.filterTournament = this.filterTournament.bind(this);
    this.loadMoreItems = this.loadMoreItems.bind(this);
  }

  connectedCallback() {
    this.render();
  }

  disconnectedCallback() {
    this.listWrapper?.removeEventListener('scrollend', this.renderList);
    this.filterButton?.removeEventListener('click', this.filterTournament);
    this.filterOpenButton?.removeEventListener('click', this.filterTournament);
    this.filterAllButton?.removeEventListener('click', this.filterTournament);
    this.listWrapper?.removeEventListener('scrollend', this.loadMoreItems);
  }

  getTournamentById(id) {
    return this.#state.tournaments.find((item) => item.id === id);
  }

  /* ------------------------------------------------------------------------ */
  /*      Render                                                              */
  /* ------------------------------------------------------------------------ */
  render() {
    this.innerHTML = this.template() + this.style();

    this.listWrapper = this.querySelector('#tournament-list-wrapper');
    this.list = this.querySelector('#tournament-list');
    this.filterButton = this.querySelector('#tournament-list-filter');
    this.filterOpenButton = this.querySelector('#tournament-filter-open');
    this.filterAllButton = this.querySelector('#tournament-filter-all');

    this.listWrapper?.addEventListener('scrollend', this.loadMoreItems);
    this.filterButton?.addEventListener('click', this.filterTournament);
    this.filterOpenButton?.addEventListener('click', this.filterTournament);
    this.filterAllButton?.addEventListener('click', this.filterTournament);

    this.renderList();
  }

  async renderList() {
    if (this.#state.totalTournaments > 0 && this.#state.tournaments.length === this.#state.totalTournaments) {
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
      if (this.#state.filter === 'pending' && this.#state.tournaments[i].status !== this.#state.filter) {
        continue;
      }
      const item = this.renderRow(this.#state.tournaments[i]);
      this.list.appendChild(item);
      ++this.#state.currentLastItemIndex;
    }
    if (this.#state.filter === 'pending' && this.#state.currentLastItemIndex === 0) {
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
    const currentParticipants = tournament.participants_count ? tournament.participants_count : 0;
    tournamentName.textContent = tournament.name;
    tournamentOrganizer.textContent = 'by ' + tournament.creator.nickname;
    tournamentOrganizerAvatar.src = tournament.creator.avatar;
    tournamentOrganizerAvatar.alt = tournament.creator.nickname;
    tournamentStatus.textContent = this.tournamentStatus(tournament.status);
    tournamentParticipants.textContent = `${currentParticipants} / ${tournament.required_participants} players`;

    item.setAttribute('tournament-id', tournament.id);
    return item;
  }

  renderNoItem() {
    const message = 'No tournaments available at the moment. Create a new one to get started.';
    const item = document.createElement('li');
    item.className = 'list-group-item text-center border-0 bg-transparent py-3';
    item.id = 'no-open-tournaments';
    item.textContent = message;
    this.list.appendChild(item);
    this.filterButton.classList.add('d-none');
  }

  /* ------------------------------------------------------------------------ */
  /*      Event handlers                                                      */
  /* ------------------------------------------------------------------------ */
  async fetchTournamentList() {
    // // TEST
    // const response = await mockTournamentList();
    // this.#state.tournaments.push(...response.items);
    // this.#state.totalTournaments = this.#state.tournaments.length;

    const response = await apiRequest(
        'GET',
        /* eslint-disable-next-line new-cap */
        API_ENDPOINTS.TOURNAMENTS(this.#state.filter, 10, this.#state.currentLastItemIndex),
        null, false, true);
    if (!response.success) {
      return;
    }
    this.#state.tournaments.push(...response.data.items);
    this.#state.totalTournaments = response.data.count;
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

  async loadMoreItems(event) {
    if (this.#state.isLoading) {
      return;
    }
    const { scrollTop, scrollHeight, clientHeight } = event.target;
    const threshold = 10;
    if (Math.ceil(scrollTop + clientHeight) < scrollHeight - threshold ||
      this.#state.totalTournaments <= this.#state.currentLastItemIndex) {
      return;
    }
    this.#state.isLoading = true;
    await this.renderList(event);
    this.#state.isLoading = false;
  }

  /* ------------------------------------------------------------------------ */
  /*      Template & style                                                    */
  /* ------------------------------------------------------------------------ */
  template() {
    return `
    <div class="dropdown-toggle text-end mb-2" role="button" data-bs-toggle="dropdown" aria-haspopup="true" aria-expanded="false" id="tournament-list-filter">
      Open for entries
    </div>
    <div class="dropdown-menu dropdown-menu-end pt-2" aria-labelledby="tournament-list-filter">
      <button class="dropdown-item text-center" id="tournament-filter-open" filter="pending">Open for entries</button>
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
    .tournament-name {
      overflow: hidden;
      text-overflow: ellipsis;
      word-break: break-all;
      display: -webkit-box;
      -webkit-line-clamp: 1;
      -webkit-box-orient: vertical;
    }
    .tournament-status {
      font-size: 0.9rem !important;
    }
    </style>`;
  }

  rowTemplate() {
    return `
    <div class="d-flex flex-row justify-content-start me-2">
      <img class="tournament-organizer-avatar avatar-m rounded-circle me-3 flex-shrink-0">
      <div class="d-flex flex-column justify-content-between flex-grow-1 flex-shrink-1">
        <p class="tournament-name fs-5 m-0"></p>
        <p class="tournament-organizer m-0"></p>
      </div>
    </div>
    <div class="d-flex flex-column justify-content-between align-items-end flex-shrink-0">
      <p class="tournament-status m-0"></p>
      <p class="tournament-participants m-0"></p>
    </div>
    `;
  }

  tournamentStatus(status) {
    const message = {
      pending: 'Open for entries',
      ongoing: 'Ongoing',
      finished: 'Finished',
    };
    return message[status] || 'Unknown';
  }
}

customElements.define('tournament-list', TournamentList);
