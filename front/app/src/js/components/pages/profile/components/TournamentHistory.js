export class UserTournamentHistory extends HTMLElement {
  #state = {
    data: [],
  };

  constructor() {
    super();
    this.tableBody = null;
    this.handleRowClick = this.handleRowClick.bind(this);
    // this._data = [];
  }

  set data(data) {
    this.#state.data = data;
    this.noHistory = this.#state.data.length === 0;
    this.render();
  }

  disconnectedCallback() {
    if (this.noHistory) {
      return;
    }
    this.tableBody.querySelectorAll('tr').forEach((row) => {
      row.removeEventListener('click', this.handleRowClick);
    });
  }

  render() {
    this.innerHTML = this.template();
    this.tableBody = this.querySelector('tbody');

    if (this.noHistory) {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td colspan="5" class="text-center">No tournament participations yet</td>
      `;
      this.tableBody.appendChild(row);
    } else {
      this.#state.data.forEach((item) => {
        const row = this.createRow(item);
        this.tableBody.appendChild(row);
        row.addEventListener('click', this.handleRowClick);
      });
    }
  }

  handleRowClick(event) {
    event.preventDefault();
    const modal = document.querySelector('game-result-modal');
    modal.showModal('tournament'); // TODO: Send id of the duel too
  }

  createRow(item) {
    console.log(item);
    const row = document.createElement('tr');
    row.innerHTML = this.rowTemplate() + this.rowStyle();

    const tournamentName = row.querySelector('.tounament-name');
    const tournamentDate = row.querySelector('.tounament-date');
    const tournamentWinnerAvatar = row.querySelector('.user-game-history-avatar');
    const tournamentWinnerNickname = row.querySelector('.winner-nickname');
    const tournamentStatus = row.querySelector('.tounament-status');

    tournamentName.textContent = item.name;
    tournamentDate.textContent = this.formatDate(item.date);
    if (item.winner) {
      tournamentWinnerAvatar.src = item.winner.avatar;
      tournamentWinnerAvatar.classList.remove('d-none');
      tournamentWinnerNickname.textContent = item.winner.username;
    }
    tournamentStatus.textContent = item.status;

    return row;
  }

  formatDate(dateDtring) {
    const date = new Date(dateDtring);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(date);
  }

  template() {
    return `
    <table class="table table-hover user-game-history-table">
    <thead>
      <tr>
        <th scope="col">Name</th>
        <th scope="col">Date</th>
        <th scope="col">Winner</th>
        <th scope="col">Status</th>
      </tr>
    </thead>
    <tbody></tbody>
    </table>
  `;
  }

  rowTemplate() {
    return `
    <tr>
      <td class="tounament-name"></td>
      <td class="tounament-date"></td>
      <td> 
        <div class="d-flex flex-row justify-content-center align-items-center">
          <img class="user-game-history-avatar avatar-s rounded-circle me-2 d-none" src="" alt="winner avatar">
          <div class="winner-nickname"></div>
        </div>
      </td>
      <td class="tounament-status"></td>
    </tr>
     `;
  }

  rowStyle() {
    return `
    <style>
      .tounament-name {
        text-align: start;
      }
    </style>
    `;
  }
}

customElements.define('user-tournament-history', UserTournamentHistory);
