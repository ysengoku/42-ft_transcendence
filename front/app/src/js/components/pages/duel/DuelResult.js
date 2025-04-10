export class DuelResult extends HTMLElement {
  // TODO
  #state = {
    loggedInUser: null,
    duelData: null,
  };

  navigateToHome() {
    router.navigate('/home');
  }

  navigateToProfile() {
    router.navigate(`/profile/${this.#state.loggedInUser.username}`);
  }

  template() {
    return `
    <div class="row justify-content-center m-2">
      <div class="form-container col-12 col-sm-10 col-md-8 col-lg-6 col-xl-5 d-flex flex-column justify-content-center align-items-center p-4">
        <p class="fs-4 my-2">'The duel is over. The winner is...'</p>
        <div>Result content</div>
        <div class="d-flex flex-row justify-content-center my-2 gap-4">
          <button class="btn btn-wood d-none" id="go-to-home-button">Go to Home</button>
          <button class="btn btn-wood d-none" id="go-to-profile-button">See my profile</button>
        </div>
      </div>
    </div>
    `;
  }
}

customElements.define('duel-result', DuelResult);
