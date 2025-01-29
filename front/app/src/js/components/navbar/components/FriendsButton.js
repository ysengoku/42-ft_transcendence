export class FriendsButton extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    this.render();
  }

  render() {
    this.innerHTML = `
			<button class="btn btn-secondary me-2 rounded-circle" id="friendsButton">
				<i class="bi bi-people"></i>
			</button>
		`;

    const button = this.querySelector('#friendsButton');
    button.addEventListener('click', () => {
      const modal = document.querySelector('friends-list-modal');
      if (modal) {
        modal.showModal();
      }
    });
  }
}
customElements.define('friends-button', FriendsButton);
