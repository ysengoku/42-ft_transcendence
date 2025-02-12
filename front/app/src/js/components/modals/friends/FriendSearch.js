export class FriendSearch extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    this.render();
    this.setupSearchHandler();
  }

  render() {
    this.innerHTML = `
      <form class="d-flex" role="search">
	      <div class="input-group">
		      <span class="input-group-text" id="basic-addon1"><i class="bi bi-search"></i></span>
          <input class="form-control me-2" type="search" placeholder="Find friend(s)" aria-label="Search">
		    </div>
        <button class="btn btn-primary" type="submit">Search</button>
      </form>
    `;
  }

  setupSearchHandler() {
    const form = this.querySelector('form');
    const input = form.querySelector('input');
    input.addEventListener('click', (event) => {
      event.stopPropagation();
    });
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const searchQuery = form.querySelector('input').value;
      this.searchFriends(searchQuery);
    });
  }

  searchFriends(searchQuery) {
    // API request to search for friends
  }
}

customElements.define('friend-search-bar', FriendSearch);
