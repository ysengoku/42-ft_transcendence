import { apiRequest, API_ENDPOINTS } from '@api';
import { formatDateMDY } from '@utils';

export class UserDuelHistory extends HTMLElement {
  #state = {
    username: '',
    items: [],
    orderedLatest: true,
    filter: 'all',
    totalMatches: 0,
    currentLastItemIndex: 0,
    isLoading: false,
  };

  #fetchLimit = 10;

  constructor() {
    super();
    this.tableBody = null;
    this.showDuelDetail = this.showDuelDetail.bind(this);
    this.loadMoreItems = this.loadMoreItems.bind(this);
    this.sortItems = this.sortItems.bind(this);
  }

  set data(data) {
    this.#state.username = data.username;
    this.#state.items = data.items;
    this.#state.currentLastItemIndex = data.items.length - 1;
    this.render();
  }

  disconnectedCallback() {
    this.sortByLatestButton?.removeEventListener('click', this.sortItems);
    this.sortByOldestButton?.removeEventListener('click', this.sortItems);
    if (this.#state.items.length === 0) {
      return;
    }
    this.tableBody.querySelectorAll('tr').forEach((row) => {
      row.removeEventListener('click', this.showDuelDetail);
    });
  }

  /* ------------------------------------------------------------------------ */
  /*     Render                                                               */
  /* ------------------------------------------------------------------------ */
  render() {
    this.innerHTML = this.template();
    this.tableBody = this.querySelector('tbody');

    if (!this.#state.items.length === 0) {
      const row = document.createElement('tr');
      const data = document.createElement('td');
      data.setAttribute('colspan', 5);
      data.classList.add('text-center');
      data.textContent = 'No duel participations yet';
      row.appendChild(data);
      this.tableBody.appendChild(row);
      return;
    }

    this.tableContainer = document.querySelector('#user-game-history-body');
    this.duelsTab = document.querySelector('#duels-tab');
    this.filterButton = document.querySelector('#game-history-filter');
    this.filterButtonAll = document.querySelector('#game-history-filter-all');
    this.filterButtonWon = document.querySelector('#game-history-filter-won');
    this.filterButtonLost = document.querySelector('#game-history-filter-lost');
    this.sortButton = document.querySelector('#game-history-sort');
    this.sortByLatestButton = document.querySelector('#game-history-sort-latest');
    this.sortByOldestButton = document.querySelector('#game-history-sort-oldest');

    this.tableContainer.addEventListener('scrollend', this.loadMoreItems);
    this.#state.items.forEach((item) => {
      const row = this.createRow(item);
      this.tableBody.appendChild(row);
    });
    this.sortByLatestButton.addEventListener('click', this.sortItems);
    this.sortByOldestButton.addEventListener('click', this.sortItems);
  }

  createRow(item) {
    const row = document.createElement('tr');
    row.innerHTML = this.rowTemplate() + this.style(item.is_winner);
    row.setAttribute('match-id', item.game_id);

    const opponentAvatar = row.querySelector('.user-game-history-avatar');
    const opponentNickname = row.querySelector('.opponent-nickname');
    const duelDate = row.querySelector('.duel-date');
    const duelScore = row.querySelector('.duel-score');
    const duelResult = row.querySelector('.result-badge');
    const eloResult = row.querySelector('.elo-result');
    const eloChangeIndicator = row.querySelector('.elo-change-indicator');

    opponentAvatar.src = item.opponent.avatar;
    opponentNickname.textContent = item.opponent.username;
    duelDate.textContent = formatDateMDY(item.date);
    duelScore.textContent = item.score;
    duelResult.textContent = item.is_winner ? 'Win' : 'Lost';
    if (!item.is_winner) {
      duelResult.classList.add('duel-lost');
    }
    eloResult.textContent = item.elo_result;
    const indicator = item.is_winner ?
      '<i class="bi bi-arrow-up-right ps-1"></i>' :
      '<i class="bi bi-arrow-down-right ps-1"></i>';
    eloChangeIndicator.innerHTML = indicator;

    row.addEventListener('click', this.showDuelDetail);
    return row;
  }

  /* ------------------------------------------------------------------------ */
  /*     Event handling                                                       */
  /* ------------------------------------------------------------------------ */
  showDuelDetail(event) {
    event.preventDefault();
    const target = event.target.closest('[match-id]');
    const matchId = target?.getAttribute('match-id');
    if (!matchId) {
      return;
    }
    const modal = document.querySelector('game-result-modal');
    modal.showModal('duel', matchId);
  }

  async loadMoreItems(event) {
    if (!this.duelsTab.classList.contains('active') || this.#state.isLoading ||
    (this.#state.totalMatches && this.#state.totalMatches <= this.#state.currentLastItemIndex + 1)) {
      return;
    }
    const { scrollTop, scrollHeight, clientHeight } = event.target;
    const threshold = 5;
    if (Math.ceil(scrollTop + clientHeight) < scrollHeight - threshold) {
      return;
    }
    await this.fetchData();
    this.#state.isLoading = false;
  }

  async sortItems(event) {
    event.preventDefault();
    if (!this.duelsTab.classList.contains('active') || this.#state.items.length === 0 || this.#state.isLoading) {
      return;
    }
    const target = event.target.closest('button');
    const order = target?.getAttribute('order');
    if (!order || this.#state.orderedLatest === (order === 'desc')) {
      return;
    }
    this.#state.orderedLatest = order === 'desc';
    this.sortButton.textContent = this.#state.orderedLatest ? 'Sort by latest' : 'Sort by oldest';
    if (this.#state.totalMatches === this.#state.currentLastItemIndex + 1) {
      const rows = Array.from(this.tableBody.children);
      rows.reverse();
      this.tableBody.innerHTML = '';
      rows.forEach((row) => {
        this.tableBody.appendChild(row);
      });
    } else {
      this.tableBody.querySelectorAll('tr').forEach((row) => {
        row.removeEventListener('click', this.showDuelDetail);
      });
      this.tableBody.innerHTML = '';
      this.#state.items = [];
      this.#state.currentLastItemIndex = 0;
      this.#state.totalMatches = 0;
      await this.fetchData();
      this.#state.isLoading = false;
    }
  }

  async fetchData() {
    this.#state.isLoading = true;
    const order = this.#state.orderedLatest ? 'desc' : 'asc';
    const endpoint =
      /* eslint-disable-next-line new-cap */
      API_ENDPOINTS.MATCHES(this.#state.username, order, this.#state.filter,
          this.#fetchLimit, this.#state.currentLastItemIndex);
    const response = await apiRequest('GET', endpoint, null, false, true);
    if (response.success) {
      this.#state.totalMatches = response.data.count;
      this.#state.items.push(...response.data.items);
      for (let i = this.#state.currentLastItemIndex; i < this.#state.items.length; i++) {
        const row = this.createRow(this.#state.items[i]);
        this.tableBody.appendChild(row);
      }
      this.#state.currentLastItemIndex = this.#state.items.length - 1;
    } else {
      // TODO: handle error (if response.status !== 401/500)
    }
  }

  /* ------------------------------------------------------------------------ */
  /*     Template & style                                                     */
  /* ------------------------------------------------------------------------ */
  template() {
    return `
    <table class="table table-hover user-game-history-table">
    <thead>
      <tr>
      <th scope="col">User</th>
      <th scope="col">Date</th>
      <th scope="col">Score</th>
      <th scope="col">Result</th>
      <th scope="col">Elo</th>
      </tr>
    </thead>
    <tbody></tbody>
    </table>
  `;
  }

  rowTemplate() {
    return `
    <tr>
      <td>
        <div class="d-flex flex-row align-items-center">
          <img class="user-game-history-avatar avatar-s rounded-circle mx-2" />
          <div class="opponent-nickname"></div>
        </div>
      </td>
      <td class="duel-date"></td>
      <td class="duel-score"></td>
      <td class="duel-result"><span class="result-badge"></span></td>
      <td>
        <div class="d-flex flex-row justify-content-center align-items-center">
          <div class="elo-result"></div>
          <div class="elo-change-indicator"></div>
        </div>
      </td>
    </tr>
     `;
  }

  style() {
    return `
    <style>
      .opponent-nickname {
        overflow: hidden;
        text-overflow: ellipsis;
        word-break: break-all;
        display: -webkit-box;
        -webkit-line-clamp: 1;
        -webkit-box-orient: vertical;
      }
      .result-badge {
        color: var(--pm-primary-100);
        background-color: var(--pm-green-400);
        font-size: 0.8rem;
        padding: 0.2rem 0.5rem;
        border-radius: 0.5rem;
        }
      .duel-lost {
        background-color: var(--pm-red-500);
      }
      i {
        font-size: 1rem;
      }
    </style>
    `;
  }
}

customElements.define('user-duel-history', UserDuelHistory);
