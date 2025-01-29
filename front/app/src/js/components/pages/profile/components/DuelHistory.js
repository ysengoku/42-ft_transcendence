export class UserDuelHistory extends HTMLElement {
  constructor() {
    super();
    this._data = [];
  }

  set data(data) {
    this._data = data;
    this.render();
  }

  connectedCallback() {
    this.render();
  }

  formatDate(dateDtring) {
    const date = new Date(dateDtring);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(date);
  }

  createRow(item) {
    const formattedDate = this.formatDate(item.date);
    return `
	  <tr>
        <td>
          <div class="d-flex flex-row align-items-center">
	        <img class="user-game-history-avatar" src="${item.opponent.avatar}">
	        ${item.opponent.username}
          </div>
        </td>
        <td>${formattedDate}</td>
        <td>${item.score}</td>
        <td>
          <span class="badge text-bg-${item.is_winner ? 'success' : 'danger'}">
            ${item.is_winner ? 'Win' : 'Lost'}
          </span>
        </td>
        <td>
          <div class="d-flex flex-row align-items-center">
		    ${item.elo_result}
		    ${
            item.is_winner ? '<i class="bi bi-arrow-up-right ps-1"></i>' :
            '<i class="bi bi-arrow-down-right ps-1"></i>'}
          </div>
        </td>
      </tr>
	`;
  }

  render() {
    const noHistory = this._data.length === 0;

    this.innerHTML = `
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
		<tbody>
      ${noHistory ?
      '<tr><td colspan="5" class="text-center">No duel participations yet</td></tr>' :
      this._data.map((item) => this.createRow(item)).join('')}
		</tbody>
	  </table>
	`;
  }
}

customElements.define('user-duel-history', UserDuelHistory);
