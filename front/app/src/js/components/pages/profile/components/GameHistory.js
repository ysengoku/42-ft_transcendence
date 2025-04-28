import { mockFetchTournamentHistory } from '@mock/functions/mockFetchTournamentHistory.js';

export class UserGameHistory extends HTMLElement {
  #state = {
    username: '',
    selectedTab: 'duel',
    filter: 'all',
    sort: 'latest',
  };

  constructor() {
    super();
    this.toggleTab = this.toggleTab.bind(this);
  }

  set data(value) {
    this.#state.username = value.username;
    this.render();

    this.userDuelHistory.data = {
      username: this.#state.username,
      items: value.matches,
    };
    // Test
    this.userTournamentHistory.data = mockFetchTournamentHistory();
    // this.userTournamentHistory.data = value.tournaments;
  }

  disconnectedCallback() {
    this.duelsTab?.removeEventListener('click', this.toggleTab);
    this.tournamentsTab?.removeEventListener('click', this.toggleTab);
  }

  render() {
    this.innerHTML = this.template() + this.style();

    this.duelsTab = this.querySelector('#duels-tab');
    this.tournamentsTab = this.querySelector('#tournaments-tab');
    this.cardBody = this.querySelector('#user-game-history-body');
    this.filterButton = this.querySelector('#game-history-filter');
    this.sortButton = this.querySelector('#game-history-sort');

    this.duelsTab.addEventListener('click', this.toggleTab);
    this.tournamentsTab.addEventListener('click', this.toggleTab);

    this.userDuelHistory = this.querySelector('user-duel-history');
    this.userTournamentHistory = this.querySelector('user-tournament-history');
  }

  toggleTab(event) {
    event.preventDefault();

    const target = event.target.closest('a');
    if (!target || target.classList.contains('active')) {
      return;
    }
    this.#state.selectedTab = target.id === 'duels-tab' ? 'duel' : 'tournament';
    this.duelsTab.classList.toggle('active');
    this.tournamentsTab.classList.toggle('active');
    this.cardBody.querySelector('.duel-history-wrapper').classList.toggle('d-none');
    this.cardBody.querySelector('.tournament-history-wrapper').classList.toggle('d-none');
  }

  template() {
    return `
    <div class="game-history-card text-center px-2">
      <div class="card-header">
        <p class="stat-label text-center pt-3">Game History</p>

        <div class="d-flex justify-content-between align-items-center px-3">
          <ul class="nav nav-tabs card-header-tabs">
            <li class="nav-item">
              <a class="nav-link active" aria-current="true" id="duels-tab">Duels</a>
            </li>
            <li class="nav-item">
              <a class="nav-link" id="tournaments-tab">Tournaments</a>
            </li>
          </ul>
          <div class="d-flex gap-4">
            <div class="dropdown-toggle" role="button" data-bs-toggle="dropdown" aria-haspopup="true" aria-expanded="false" id="game-history-filter">
              All
            </div>
            <div class="dropdown-menu dropdown-menu-end pt-2" aria-labelledby="game-history-filter">
              <button class="dropdown-item text-center" id="game-history-filter-all" filter="all">All</button>
              <button class="dropdown-item text-center" id="game-history-filter-won" filter="won">Won</button>
              <button class="dropdown-item text-center" id="game-history-filter-lost" filter="lost">Lost</button>
            </div>
            <div class="dropdown-toggle" role="button" data-bs-toggle="dropdown" aria-haspopup="true" aria-expanded="false" id="game-history-sort">
              Sort by latest
            </div>
            <div class="dropdown-menu dropdown-menu-end pt-2" aria-labelledby="game-history-sort">
              <button class="dropdown-item text-center" id="game-history-sort-latest" order="desc">Sort by latest</button>
              <button class="dropdown-item text-center" id="game-history-sort-oldest" order="asc">Sort by oldest</button>
            </div>
          </div>
        </div>
      </div>

      <div class="card-body px-2 pt-0 mt-2 table-container" id="user-game-history-body">
        <div class="duel-history-wrapper">
          <user-duel-history></user-duel-history>
        </div>
        <div class="tournament-history-wrapper d-none">
          <user-tournament-history></user-tournament-history>
        </div>
      </div>
    </div>
    `;
  }

  style() {
    return `
    <style>
      .game-history-card {
        background-color: rgba(var(--pm-primary-600-rgb), 0.1);
        color: var(--pm-primary-700);
        .card-header-tabs .nav-link {
          color: var(--pm-primary-700);
          font-weight: bold;
          border: none;
          background-color: transparent !important;
        }
        .card-header-tabs .nav-link.active {
          border-bottom: 4px solid var(--pm-primary-600);
        }
      }
      .user-game-history-table {
        font-size: 14px;
        txt-decoration: none;
      }
      .user-game-history-table td {
        vertical-align: middle;
        background-color: transparent;
        color: black;
        padding: 1rem 0 1rem 0.5rem;
      }
      .bi-arrow-up-right {
        color: var(--pm-green-400);
      }
      .bi-arrow-down-right {
        color: var(--pm-red-500);
      }
      .table-container {
        max-height: 640px;
        overflow-y: auto;
      }
      .table-container thead th {
        --bs-table-bg: var(--pm-primary-700);
        --bs-table-color: white;
        font-weight:normal;
        position: sticky;
        top: 0;
        z-index: 1;
      }
      .table-container::-webkit-scrollbar {
        width: 4px;
      }
      .table-container::-webkit-scrollbar-track {
        background: var(--pm-gray-400);
      }
      .table-container::-webkit-scrollbar-thumb {
        background: var(--pm-primary-700);
        border-radius: 4px;
      }
      td {
        font-size: 1rem;
      }
    </style>
    `;
  }
}

customElements.define('user-game-history', UserGameHistory);
