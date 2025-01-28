import { mockFetchDuelHistory } from "@mock/functions/mockFetchDuelHistory.js";

export class UserGameHistory extends HTMLElement {
  constructor() {
    super();
	this._data = {
	  matches: [],
	  tournaments: []
	}
  }

  set data(value) {
    this._data = value;
    this.render();
  }

  connectedCallback() {
    this.render();
  }

  render() {
    this._data.matches = mockFetchDuelHistory();  // Test data
	  // console.log(this._data.matches);
    this.innerHTML = `
	  <style>
	  	.nav-link {
		  color: black;
		  font-size: 0.8rem;
		}
		.nav-link.active{
  	    }
		.nav-link:hover{
		  color: black;
  	    }
		.card {
		  background-color: rgba(0, 0,0, 0.1);
		  color: black;
		}
		.user-game-history-avatar {
		    width: 24px;
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
		.table-container thead {
	      --bs-table-bg: transparent;
		  --bs-table-color: black;
        }
        .table-container::-webkit-scrollbar {
          width: 4px;
        }
        .table-container::-webkit-scrollbar-track {
          background: grey;
        }
        .table-container::-webkit-scrollbar-thumb {
          background: black;
          border-radius: 4px;
        }
      </style>
      <div class="card text-center px-2">
	    <div class="card-header">
	      <p class="text-start">Game History</p>
          <ul class="nav nav-tabs card-header-tabs">
            <li class="nav-item">
              <a class="nav-link active" aria-current="true" id="duels-tab">Duels</a>
            </li>
            <li class="nav-item">
              <a class="nav-link" id="tournaments-tab">Tournaments</a>
            </li>
          </ul>
        </div>

        <div class="card-body p-2 table-container" id="user-game-history-body">
          <user-duel-history></user-duel-history>
        </div>
      </div>
	  `;

    const duelsTab = this.querySelector("#duels-tab");
    const tournamentsTab = this.querySelector("#tournaments-tab");
    const cardBody = this.querySelector("#user-game-history-body");

    duelsTab.addEventListener("click", (event) => {
      event.preventDefault();
      duelsTab.classList.add("active");
      tournamentsTab.classList.remove("active");
      cardBody.innerHTML = "";
      const userDuelHistory = document.createElement("user-duel-history");
	  userDuelHistory.data = this._data.matches;
      cardBody.appendChild(userDuelHistory);
    });

    tournamentsTab.addEventListener("click", (event) => {
      event.preventDefault();
      tournamentsTab.classList.add("active");
      duelsTab.classList.remove("active");
      cardBody.innerHTML = "";
      const userTournamentHistory = document.createElement(
        "user-tournament-history"
      );
      cardBody.appendChild(userTournamentHistory);
    });

	const userDuelHistory = this.querySelector("user-duel-history");
	userDuelHistory.data = this._data.matches;
  }
}

customElements.define("user-game-history", UserGameHistory);
