// import { mockFetchDuelHistory } from '@mock/functions/mockFetchDuelHistory.js';
import { mockFetchTournamentHistory } from '@mock/functions/mockFetchTournamentHistory.js';

export class UserGameHistory extends HTMLElement {
  constructor() {
    super();
    this._data = {
      matches: [],
      tournaments: [],
    };
    this.handleDuelTabClick = this.handleDuelTabClick.bind(this);
    this.handleTournamentTabClick = this.handleTournamentTabClick.bind(this);
  }

  set data(value) {
    this._data = value;
    this.render();
  }

  disconnectedCallback() {
    this.duelsTab?.removeEventListener('click', this.handleDuelTabClick);
    this.tournamentsTab?.removeEventListener('click', this.handleTournamentTabClick);
  }

  render() {
    // this._data.matches = mockFetchDuelHistory();
    this._data.tournaments = mockFetchTournamentHistory();
    this.innerHTML = this.template() + this.style();

    this.duelsTab = this.querySelector('#duels-tab');
    this.tournamentsTab = this.querySelector('#tournaments-tab');
    this.cardBody = this.querySelector('#user-game-history-body');

    this.duelsTab.addEventListener('click', this.handleDuelTabClick);
    this.tournamentsTab.addEventListener('click', this.handleTournamentTabClick);

    const userDuelHistory = this.querySelector('user-duel-history');
    userDuelHistory.data = this._data.matches;
  }

  handleDuelTabClick(event) {
    event.preventDefault();
    this.duelsTab.classList.add('active');
    this.tournamentsTab.classList.remove('active');
    this.cardBody.innerHTML = '';
    const userDuelHistory = document.createElement('user-duel-history');
    userDuelHistory.data = this._data.matches;
    this.cardBody.appendChild(userDuelHistory);
  }

  handleTournamentTabClick(event) {
    event.preventDefault();
    this.tournamentsTab.classList.add('active');
    this.duelsTab.classList.remove('active');
    this.cardBody.innerHTML = '';
    const userTournamentHistory = document.createElement('user-tournament-history');
    userTournamentHistory.data = this._data.tournaments;
    this.cardBody.appendChild(userTournamentHistory);
  }

  template() {
    return `
    <div class="game-history-card text-center px-2">
      <div class="card-header">
        <p class="stat-label text-center pt-2">Game History</p>

        <div class="d-flex justify-content-between align-items-center px-3">
          <ul class="nav nav-tabs card-header-tabs">
            <li class="nav-item">
              <a class="nav-link active" aria-current="true" id="duels-tab">Duels</a>
            </li>
            <li class="nav-item">
              <a class="nav-link" id="tournaments-tab">Tournaments</a>
            </li>
          </ul>
          <div class="dropdown-toggle" id="navbarDropdown" role="button" data-bs-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
            Sort by latest
          </div>
          <ul class="dropdown-menu dropdown-menu-end" aria-labelledby="navbarDropdown">
            <li><button class="dropdown-item">Sort by latest</button></li>
            <li><button class="dropdown-item">Sort by oldest</button></li>
          </ul>
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
      .bi-arrow-up-right {
        color: green;
      }
      .bi-arrow-down-right {
        color: red;
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
