export class UserTournamentHistory extends HTMLElement {
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
    const participants = item.participants.length;
    return `
    <tr>
	  <td>${item.name}</td>
	  <td>${formattedDate}</td>
      <td>
        <div class="d-flex flex-row align-items-center">
          <img class="user-game-history-avatar" src="${item.winner.avatar}">
          ${item.winner.username}
        </div>
      </td>
      <td>${participants}</td>
      <td>${item.status}</td>
    </tr>
    `;
  }

  render() {
    const noHistory = this._data.length === 0;

    this.innerHTML = `
    <table class="table table-hover user-game-history-table">
      <thead>
      <tr>
        <th scope="col">Name</th>
        <th scope="col">Date</th>
        <th scope="col">Winner</th>
        <th scope="col">Participants</th>
        <th scope="col">Status</th>
      </tr>
      </thead>
      <tbody>
	    ${noHistory ?
		'<tr><td colspan="5" class="text-center">No tournament participations yet</td></tr>' :
        this._data.map((item) => this.createRow(item)).join('')}
      </tbody>
    </table>
    `;
  }
}

customElements.define('user-tournament-history', UserTournamentHistory);
