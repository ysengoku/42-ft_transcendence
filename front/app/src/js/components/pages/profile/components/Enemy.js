export class ProfileEnemy extends HTMLElement {
  constructor() {
    super()
    ;(this._data = null), (this._type = null);
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
				.enemy-avatar-container img {
					width: 88px;
					aspect-ratio: 1;
					object-fit: cover;
				}
			</style>
			<div class="d-flex flex-column px-3 pb-1 h-100">
				<div class="d-flex flex-row justify-content-center align-items-start pt-3 h-100">
					<div class="enemy-avatar-container flex-grow-1 d-flex flex-column justify-content-center align-items-center px-2">
						<p class="lh-1 fs-5">${enemy.username}</p>
						<img src="${enemy.avatar}" alt="User Avatar" class="rounded-circle">
					</div>
					<div class="mb-1 py-2">
						<p class="no-margin fs-6">Elo: ${enemy.elo}</p>
						<p class="no-margin fs-6">Win rate: ${enemy.winrate}</p>
						<small>win ${enemy.wins} - losses ${enemy.loses}</small>
					</div>
				</div>
			</div>
			`;
    } else {
      this.innerHTML = `
			<div class="flex-grow-1 px-3 h-100">
				<p class="text-center pt-3">No ${type.toLowerCase()}</p>
			</div>
			`;
    }
  }
}

customElements.define('profile-enemy-component', ProfileEnemy);
