import sheriff from '../../../../../../public/img/sheriff.png';

export class ProfileStatCard extends HTMLElement {
  constructor() {
    super();
    this._title = null;
    this._value = null;
  }

  static get observedAttributes() {
    return ['title', 'value'];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'title') {
      this._title = newValue;
      this.render();
    } else if (name === 'value') {
      this._value = newValue;
      this.render();
    }
  }

  connectedCallback() {
    this.render();
  }

  render() {
    const title = this._title;
    const value = this._value;

    this.innerHTML = `
			<style>
				.stat-card {
					width: 96px;
					height: 96px;
					background-image: url(${sheriff});
					padding: 8px;
					background-size: cover;
                    background-position: center;
				}
			</style>
			<div class="stat-card d-flex flex-column justify-content-cernter align-items-center pt-4">
				<small class="no-margin">${title}</small>
				<p class="no-margin fs-5">${value}</p>
			</div>
			`;
  }
}

customElements.define('profile-stat-card', ProfileStatCard);
