import { mockFetchDuelHistory } from '@mock/functions/mockFetchDuelHistory.js';
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
    this.duelsTab.removeEventListener('click', this.handleDuelTabClick);
    this.tournamentsTab.removeEventListener('click', this.handleTournamentTabClick);
  }

  render() {
    this._data.matches = mockFetchDuelHistory();
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
    <div class="card text-center px-2">
      <div class="card-header">
        <p class="stat-label text-center">Game History</p>
        <ul class="nav nav-tabs card-header-tabs">
          <li class="nav-item">
            <a class="nav-link active" aria-current="true" id="duels-tab">Duels</a>
          </li>
          <li class="nav-item">
            <a class="nav-link" id="tournaments-tab">Tournaments</a>
          </li>
        </ul>
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
      .card {
        background-color:rgba(97, 51, 4, 0.1);
        color: #351901;
      }
      .nav-link {
        color: #351901;
        font-weight: bold;
      }
      .card-header-tabs .nav-link.active {
        color: #351901;
        background-color: transparent !important;
        border: none;
        border-bottom: 4px solid #613304;
        }
      .nav-link:hover{
        color: #613304;
        border: none;
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
      .user-game-history-avatar {
        width: 36px;
        aspect-ratio: 1;
        object-fit: cover;
        border-radius: 50%;
        background-color: grey;
        margin-right: 8px;
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
        --bs-table-bg: #351901;
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
        background: #898380;
      }
      .table-container::-webkit-scrollbar-thumb {
        background: #351901;
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
