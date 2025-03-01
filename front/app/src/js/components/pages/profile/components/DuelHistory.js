export class UserDuelHistory extends HTMLElement {
  #state = {
    data: [],
  };

  constructor() {
    super();
    this.tableBody = null;
    this.handleRowClick = this.handleRowClick.bind(this);
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
        <td colspan="5" class="text-center">No duel participations yet</td>
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
    modal.showModal('duel');  // TODO: Send id of the duel too
  }

  createRow(item) {
    const row = document.createElement('tr');
    row.innerHTML = this.rowTemplate();
  
    const opponentAvatar = row.querySelector('.user-game-history-avatar');
    const opponentNickname = row.querySelector('.opponent-nickname');
    const duelDate = row.querySelector('.duel-date');
    const duelScore = row.querySelector('.duel-score');
    const duelResult = row.querySelector('.duel-result');
    const eloResult = row.querySelector('.elo-result');
    const eloChangeIndicator = row.querySelector('.elo-change-indicator');
  
    opponentAvatar.src = item.opponent.avatar;
    opponentNickname.textContent = item.opponent.username;
    duelDate.textContent = this.formatDate(item.date);
    duelScore.textContent = item.score;
    duelResult.innerHTML = `
      <span class="badge text-bg-${item.is_winner ? 'success' : 'danger'}">
        ${item.is_winner ? 'Win' : 'Lost'}
      </span>`;
    eloResult.textContent = item.elo_result;
    const indicator = item.is_winner ? '<i class="bi bi-arrow-up-right ps-1"></i>' :
      '<i class="bi bi-arrow-down-right ps-1"></i>';
    eloChangeIndicator.innerHTML = indicator;

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
	        <img class="user-game-history-avatar" />
          <div class="opponent-nickname">Nickname</div>
        </div>
      </td>
      <td class="duel-date">Date</td>
      <td class="duel-score">Score</td>
      <td class="duel-result">Result</td>
      <td>
        <div class="d-flex flex-row align-items-center">
          <div class="elo-result">elo</div>
          <div class="elo-change-indicator">↑</div>
        </div>
      </td>
    </tr>
	   `;
  }
}

customElements.define('user-duel-history', UserDuelHistory);
