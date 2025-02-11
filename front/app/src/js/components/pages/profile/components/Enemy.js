export class UserEnemy extends HTMLElement {
  constructor() {
    super();
    this._data = null;
    this._type = null;
  }

  static get observedAttributes() {
    return ['type'];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'type') {
      this._type = newValue;
      this.render();
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
    // Test data ---------------------------------------
    if (this._type === 'best') {
      this._data = {
        username: 'George',
        avatar: '/media/avatars/sample_avatar2.jpg',
        wins: 20,
        loses: 10,
        winrate: 67,
        elo: 1100,
      };
    }
    // -------------------------------------------------

    const type = this._type === 'best' ? 'Best Enemy' : 'Worst Enemy';
    if (this._data) {
      const enemy = this._data;
      this.innerHTML = `
			<style>
				.enemy-avatar-container {
					height: 144px;
				}	
				.enemy-avatar-container img {
    				width: 88px;
    				aspect-ratio: 1;
    				object-fit: cover;
				}
			</style>
      <div class="d-flex flex-column justify-content-start enemy-container py-2">
			  <p class="no-margin ms-1 text-center">${type}</p>
			  <div class="enemy-avatar-container">
				  <p class="lh-1 fs-5 ps-4 py-2 no-margin">${enemy.username}</p>
				  <div class="d-flex flex-row justify-content-around align-items-start p-1">
					  <div class="d-flex flex-column justify-content-start px-2">
					  <img src="${enemy.avatar}" alt="User Avatar" class="rounded-circle">
					  </div>
					  <div>
						  <p class="no-margin fs-6">Elo: ${enemy.elo}</p>
						  <p class="no-margin fs-6">Win rate: ${enemy.winrate}</p>
						  <small>win ${enemy.wins} - losses ${enemy.loses}</small>
					  </div>
				  </div>
			  </div>
      </div>
			`;
    } else {
      this.innerHTML = `
      <div class="d-flex flex-column justify-content-start enemy-container py-2">
			  <p class="no-margin ms-1 text-center">${type}</p>
			  <div class="enemy-avatar-container d-flex flex-column justify-content-center text-center p-2">
				  <p>No ${type.toLowerCase()}</p>
			  </div>
      </div>
			`;
    }
  }
}

customElements.define('user-enemy-component', UserEnemy);
