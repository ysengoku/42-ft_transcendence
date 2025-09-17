/**
 * @module TournamentList
 * @description Displays a list of tournaments with filtering and lazy loading capabilities.
 * It allows users to view tournaments that are open for entries, all tournaments.
 */

import { apiRequest, API_ENDPOINTS } from '@api';
import { setupObserver } from '@utils';
import anonymousAvatar from '/img/anonymous-avatar.png?url';

export class TournamentList extends HTMLElement {
  /**
   * Private state object to hold the component's state.
   * @property {Array} tournaments - List of tournaments.
   * @property {'pending'|'all'} filter - Current filter applied to the tournaments.
   * @property {number} totalTournaments - Total number of tournaments available in database.
   * @property {number} currentLastItemIndex - Index of the last item rendered in the list.
   * @property {boolean} isLoading - Indicates if the component is currently loading data.
   */
  #state = {
    tournaments: [],
    filter: 'pending',
    totalTournaments: 0,
    currentLastItemIndex: 0,
    isLoading: false,
  };

  /**
   * @property {IntersectionObserver|null} observer - The IntersectionObserver instance for lazy loading.
   * @property {HTMLElement|null} loadMoreAnchor - The anchor element for loading more items.
   */
  observer = null;
  loadMoreAnchor = null;

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
    this.cleanObserver();
    this.filterButton?.removeEventListener('click', this.filterTournament);
    this.filterOpenButton?.removeEventListener('click', this.filterTournament);
    this.filterAllButton?.removeEventListener('click', this.filterTournament);
  }

  getTournamentById(id) {
    return this.#state.tournaments.find((item) => item.id === id);
  }

  /* ------------------------------------------------------------------------ */
  /*      Render                                                              */
  /* ------------------------------------------------------------------------ */

  /**
   * @description
   * Renders the component by setting its inner HTML with styles and templates.
   * It initializes the list wrapper, list, and filter buttons, sets up event listeners,
   * and calls the method to render the tournament list.
   * It also sets up the IntersectionObserver for lazy loading.
   * @returns {Promise<void>}
   */
  async render() {
    this.innerHTML = this.style() + this.template();

    this.listWrapper = this.querySelector('#tournament-list-wrapper');
    this.list = this.querySelector('#tournament-list');
    this.filterButton = this.querySelector('#tournament-list-filter');
    this.filterOpenButton = this.querySelector('#tournament-filter-open');
    this.filterAllButton = this.querySelector('#tournament-filter-all');

    this.filterButton?.addEventListener('click', this.filterTournament);
    this.filterOpenButton?.addEventListener('click', this.filterTournament);
    this.filterAllButton?.addEventListener('click', this.filterTournament);

    await this.renderList();
    this.cleanObserver();
    [this.observer, this.loadMoreAnchor] = setupObserver(this.list, this.loadMoreItems);
  }

  /**
   * @description
   * Renders the list of tournaments based on the current state.
   * It checks if the total tournaments match the current list length,
   * and if not, it fetches more tournaments from the API.
   * It then iterates through the tournaments, filtering them based on the current filter,
   * and appends each tournament as a list item to the list.
   * If no tournaments are available, it renders a message indicating that.
   * It also handles the loading state to prevent multiple fetches at the same time.
   * @returns {Promise<void>}
   */
  async renderList() {
    if (this.#state.totalTournaments > 0 && this.#state.tournaments.length === this.#state.totalTournaments) {
      return;
    }
    this.#state.isLoading = true;
    await this.fetchTournamentList();
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

  /**
   * @description
   * Renders a single row for a tournament item.
   * It creates a list item element, sets its class and inner HTML using the row template,
   * and populates it with tournament data such as name, organizer, status, and participants.
   * It also sets the tournament ID as an attribute on the list item.
   * @returns {HTMLElement} The list item element representing the tournament.
   * @param {Object} tournament - The tournament data to render.
   */
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
    const creatorAlias = tournament.tournament_creator ? tournament.tournament_creator.alias : 'Unknown gunslinger';
    const creatorAvatar = tournament.tournament_creator
      ? tournament.tournament_creator.profile.avatar
      : anonymousAvatar;
    tournamentName.textContent = tournament.name;
    tournamentOrganizer.textContent = 'by ' + creatorAlias;
    tournamentOrganizerAvatar.src = creatorAvatar;
    tournamentOrganizerAvatar.alt = creatorAlias;
    tournamentStatus.textContent = this.tournamentStatus(tournament.status);
    tournamentParticipants.textContent = `${currentParticipants} / ${tournament.required_participants} players`;

    item.setAttribute('tournament-id', tournament.id);
    return item;
  }

  /**
   * @description
   * Renders a message indicating that there are no tournaments available.
   */
  renderNoItem() {
    const message = 'No tournaments available at the moment.';
    const item = document.createElement('li');
    item.className = 'list-group-item text-center border-0 bg-transparent py-3';
    item.id = 'no-open-tournaments';
    item.textContent = message;
    this.list.appendChild(item);
  }

  cleanObserver() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    if (this.loadMoreAnchor) {
      this.loadMoreAnchor.parentNode?.removeChild(this.loadMoreAnchor);
      this.loadMoreAnchor = null;
    }
  }

  /* ------------------------------------------------------------------------ */
  /*      Event handlers                                                      */
  /* ------------------------------------------------------------------------ */

  /**
   * @description
   * Fetches the list of tournaments from the API based on the current filter and pagination.
   * It makes an API request to get tournaments, appending the results to the current list
   * and updating the total count of tournaments.
   * @returns {Promise<void>}
   */
  async fetchTournamentList() {
    const response = await apiRequest(
      'GET',
      /* eslint-disable-next-line new-cap */
      API_ENDPOINTS.TOURNAMENTS(this.#state.filter, 10, this.#state.currentLastItemIndex),
      null,
      false,
      true,
    );
    if (!response.success) {
      return;
    }
    this.#state.tournaments.push(...response.data.items);
    this.#state.totalTournaments = response.data.count;
  }

  /**
   * @description
   * Filters the tournaments based on the button clicked (either "Open for entries" or "All tournaments").
   * It prevents the default action of the event, checks if the filter is already applied,
   * and if not, updates the state with the new filter.
   * It resets the current last item index and total tournaments, clears the list,
   * and re-renders the list with the new filter applied.
   * It also handles the loading state and re-observes the load more anchor for lazy loading.
   * @param {Event} event - The event triggered by clicking the filter button.
   * @returns {Promise<void>}
   */
  async filterTournament(event) {
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
    this.#state.isLoading = true;
    await this.renderList();
    this.#state.isLoading = false;
    this.observer.unobserve(this.loadMoreAnchor);
    this.list.appendChild(this.loadMoreAnchor);
    this.observer.observe(this.loadMoreAnchor);
  }

  /**
   * @description
   * Loads more items when the user scrolls to the bottom of the list.
   * It checks if the component is already loading, if the entry is intersecting, and if there are more tournaments to load.
   * If all conditions are met, it sets the loading state to true, calls the method to render the list, sets the loading state back to false,
   * and re-observes the load more anchor for further lazy loading.
   * @param {*} entries - The entries from the IntersectionObserver.
   * @returns {Promise<void>}
   */
  async loadMoreItems(entries) {
    if (this.#state.isLoading) {
      return;
    }
    const entry = entries[0];
    if (!entry.isIntersecting || this.#state.totalTournaments <= this.#state.currentLastItemIndex) {
      return;
    }
    this.#state.isLoading = true;
    await this.renderList();
    this.#state.isLoading = false;
    this.observer.unobserve(this.loadMoreAnchor);
    this.list.appendChild(this.loadMoreAnchor);
    this.observer.observe(this.loadMoreAnchor);
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

    <div id="tournament-list-wrapper">
      <ul class="list-group" id="tournament-list"></ul>
    </div>
    `;
  }

  style() {
    return `
    <style>
    #tournament-list {
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
      display: -webkit-box; /* Compatible for Firefox */
      -webkit-line-clamp: 1; /* Compatible for Firefox by combining with display: -webkit-box; */
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
