export class UserGameHistory extends HTMLElement {
  #state = {
    username: '',
    filter: 'all',
    sort: 'latest',
  };

  constructor() {
    super();
  }

  set data(value) {
    this.#state.username = value.username;
    this.render();

    this.userDuelHistory.data = {
      username: this.#state.username,
      items: value.matches,
    };
  }

  render() {
    this.innerHTML = this.style() + this.template();

    this.cardBody = this.querySelector('#user-game-history-body');
    this.filterButton = this.querySelector('#game-history-filter');
    this.sortButton = this.querySelector('#game-history-sort');
    this.userDuelHistory = this.querySelector('user-duel-history');
  }

  template() {
    return `
    <div class="game-history-card text-center px-2">
      <div class="card-header">
        <p class="stat-label text-center pt-3">Duel History</p>

        <div class="d-flex justify-content-between align-items-center px-3">
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
        <user-duel-history></user-duel-history>
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
      /* For Firefox */
      .table-container {
        scrollbar-width: thin;
        scrollbar-color: var(--pm-primary-700) var(--pm-gray-400);
      }
      td {
        font-size: 1rem;
      }
    </style>
    `;
  }
}

customElements.define('user-game-history', UserGameHistory);
