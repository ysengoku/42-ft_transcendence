import { router } from '@router';
import anonymousavatar from '/img/anonymous-avatar.png?url';

export const OVERLAY_TYPE = Object.freeze({
  PENDING: 'pending',
  PAUSE: 'pause',
  GAMEOVER: 'game_over',
  CANCEL: 'cancel',
  ERROR: 'error',
});

export class GameOverlay extends HTMLElement {
  #gameType = ''; // 'local-classic' , 'local-ai', or 'multiplayer'
  #intervalGameId = null;

  constructor() {
    super();

    this.navigateToHome = this.navigateToHome.bind(this);
    this.navigateToGameMenu = this.navigateToGameMenu.bind(this);

    this.overlay = null;
    this.overlayMessageWrapper = null;
    this.overlayButton1 = null;
    this.overlayButton2 = null;
  }

  set gameType(type) {
    this.#gameType = type;
  }

  connectedCallback() {
    this.render();
  }

  disconnectedCallback() {
    this.overlayButton1?.removeEventListener('click', this.navigateToGameMenu);
    this.overlayButton2?.removeEventListener('click', this.navigateToHome);
  }

  render() {
    this.innerHTML = this.style() + this.template();

    this.overlay = this.querySelector('#overlay');
    this.overlayMessageWrapper = this.querySelector('#game-overlay-message-wrapper');
    this.overlayContent = this.querySelector('#game-overlay-content');
  }

  clearGameInterval() {
    if (this.#intervalGameId) {
      clearInterval(this.#intervalGameId);
      this.#intervalGameId = null;
    }
  }

  hideOverlay() {
    if (this.#intervalGameId) {
      clearInterval(this.#intervalGameId);
    }
    this.overlay.classList.remove('overlay-dark');
    this.overlayMessageWrapper.classList.add('d-none');
    this.overlayContent.innerHTML = '';
    this.overlayButton1?.removeEventListener('click', this.navigateToDuelMenu);
    this.overlayButton2?.removeEventListener('click', this.navigateToHome);
    this.overlayButton1 = null;
    this.overlayButton2 = null;
    // Reset any inline styles that might affect positioning
    this.overlayMessageWrapper.style.transform = '';
    this.overlayMessageWrapper.style.top = '';
    this.overlayMessageWrapper.style.left = '';
  }

  show(action, data = null) {
    this.overlayContent.innerHTML = this.overlayContentTemplate[action];
    this.overlay.classList.add('overlay-dark');
    this.overlayMessageWrapper.classList.remove('d-none');
    this.clearGameInterval();
    
    // Force the overlay to use fixed positioning (defensive)
    this.overlay.style.position = 'fixed';
    this.overlay.style.top = '0';
    this.overlay.style.left = '0';
    this.overlay.style.width = '100vw';
    this.overlay.style.height = '100vh';
    this.overlay.style.zIndex = '9999';
    
    this.overlayMessageWrapper.style.position = 'fixed';
    this.overlayMessageWrapper.style.top = '50%';
    this.overlayMessageWrapper.style.left = '50%';
    this.overlayMessageWrapper.style.transform = 'translate(-50%, -50%)';
    this.overlayMessageWrapper.style.zIndex = '10000';
    switch (action) {
      case OVERLAY_TYPE.PAUSE:
        let remainingTime = data.remaining_time;
        const overlayMessageContent = this.querySelector('#overlay-message-content');
        overlayMessageContent.textContent = `Player ${data.name} disconnected.`;
        const overlayMessageTimer = this.querySelector('#overlay-message-timer');
        overlayMessageTimer.textContent = remainingTime;
        this.#intervalGameId = setInterval(() => {
          remainingTime -= 1;
          overlayMessageTimer.textContent = remainingTime;
          if (remainingTime <= 0) {
            clearInterval(this.#intervalGameId);
            this.hideOverlay();
          }
        }, 1000);
        break;
      case OVERLAY_TYPE.GAMEOVER:
        let player1 = null;
        let player2 = null;
        const isTournament = data.tournament_id ? true : false;
        data.winner.number === 1
          ? ((player1 = data.winner), (player1.winner = true), (player2 = data.loser), (player2.winner = false))
          : ((player2 = data.winner), (player2.winner = true), (player1 = data.loser), (player1.winner = false));
        const player1Element = this.createPlayerResultElement(player1, data.elo_change, isTournament);
        const player2Element = this.createPlayerResultElement(player2, data.elo_change, isTournament);
        const gameResultElement = this.querySelector('#overlay-game-result');
        gameResultElement.appendChild(player1Element);
        gameResultElement.appendChild(player2Element);
        if (isTournament) {
          setTimeout(() => {
            router.redirect(`tournament/${data.tournament_id}`);
          }, 1500);
        }

      case OVERLAY_TYPE.CANCEL:
        this.overlayButton1 = this.querySelector('#overlay-button1');
        this.overlayButton2 = this.querySelector('#overlay-button2');
        if (data.tournament_id) {
          this.overlayButton1?.classList.add('d-none');
          this.overlayButton2?.classList.add('d-none');
        } else {
          this.overlayButton1?.addEventListener('click', this.navigateToGameMenu);
          this.overlayButton2?.addEventListener('click', this.navigateToHome);
          if (this.#gameType !== 'multiplayer') {
            this.overlayButton1.textContent = 'Go back to Local Game Menu';
          }
        }
        break;
      case OVERLAY_TYPE.ERROR:
        const titleElement = this.querySelector('#overlay-message-title');
        const contentElement = this.querySelector('#overlay-message-content');
        const buttonsContainer = this.querySelector('#error-buttons');
        
        titleElement.textContent = data.title || 'Error';
        contentElement.textContent = data.message || 'An error occurred';
        
        // Clear existing buttons to prevent stacking
        buttonsContainer.innerHTML = '';
        
        // Add buttons based on data
        if (data.showRetry) {
          const retryButton = document.createElement('button');
          retryButton.className = 'btn btn-outline-light fw-bold mb-2';
          retryButton.textContent = 'Retry';
          retryButton.onclick = () => this.handleRetry(retryButton, data.onRetry || (() => window.location.reload()));
          buttonsContainer.appendChild(retryButton);
        }
        
        if (data.actions) {
          data.actions.forEach(action => {
            const button = document.createElement('button');
            button.className = 'btn btn-outline-light fw-bold mb-2';
            button.textContent = action.label;
            button.onclick = () => this.handleRetry(button, action.onClick);
            buttonsContainer.appendChild(button);
          });
        }
        
        // Always add a close button that goes back to home
        const closeButton = document.createElement('button');
        closeButton.className = 'btn btn-secondary fw-bold';
        closeButton.textContent = 'Back to Saloon';
        closeButton.onclick = () => {
          this.hideOverlay();
          // Restore the game UI before leaving (in case user navigates back)
          const gameComponent = this.closest('singleplayer-game');
          if (gameComponent && gameComponent.showGameUI) {
            gameComponent.showGameUI();
          }
          router.redirect('/home');
        };
        buttonsContainer.appendChild(closeButton);
        break;
      default:
        break;
    }
  }

  handleRetry(button, retryAction) {
    const originalText = button.textContent;
    button.textContent = 'Loading...';
    button.disabled = true;
    button.classList.add('btn-secondary');
    button.classList.remove('btn-outline-light');
    
    try {
      const result = retryAction();
      // If retry returns a promise, handle it properly
      if (result instanceof Promise) {
        result.catch(() => {
          // Reset button state if retry fails
          button.textContent = originalText;
          button.disabled = false;
          button.classList.remove('btn-secondary');
          button.classList.add('btn-outline-light');
        });
      }
    } catch (error) {
      // Reset button state if retry fails immediately
      button.textContent = originalText;
      button.disabled = false;
      button.classList.remove('btn-secondary');
      button.classList.add('btn-outline-light');
    }
  }

  createPlayerResultElement(player, eloChange, isTournament) {
    const element = document.createElement('div');
    element.innerHTML = this.playerResultTemplate();
    const result = element.querySelector('.match-result');
    player.winner
      ? ((result.textContent = 'Winner'), result.classList.add('match-result-winner'))
      : ((result.textContent = 'Loser'), result.classList.add('match-result-loser'));
    const avatar = element.querySelector('img');
    if (player.avatar) {
      avatar.src = player.avatar;
      avatar.alt = player.name;
    } else {
      avatar.src = anonymousavatar;
    }
    if (player.name && player.name.length > 0) {
      element.querySelector('.overlay-player-name').textContent = player.name;
    } else {
      element.querySelector('.overlay-player-name').textContent = 'Anonymous player';
    }
    if (this.#gameType === 'multiplayer' && player.elo && !isTournament) {
      const eloWrapper = element.querySelector('.overlay-player-elo');
      eloWrapper.querySelector('.game-elo').textContent = player.elo;
      eloWrapper.querySelector('i').className = player.winner ? 'bi bi-arrow-up-right' : 'bi i-arrow-down-right';
      eloWrapper.querySelector('.game-elo-change').textContent = player.winner ? `+${eloChange}` : `-${eloChange}`;
    }
    return element;
  }

  navigateToGameMenu() {
    this.#gameType === 'multiplayer' ? router.redirect('/duel-menu') : router.redirect('/local-game-menu');
  }

  navigateToHome() {
    router.redirect('/home');
  }

  template() {
    return `
    <div id="overlay" class="position-absolute w-100 h-100">
      <div id="game-overlay-message-wrapper" class="position-absolute text-center wood-board pt-5 pb-3 d-none">
        <div id="game-overlay-content" class="d-flex flex-column align-items-center"></div>
      </div>
    </div>
    `;
  }

  style() {
    return `
    <style>
    #overlay {
      z-index: 9999 !important;
      top: 0 !important;
      left: 0 !important;
      position: fixed !important;
      width: 100vw !important;
      height: 100vh !important;
    }
    .overlay-dark {
      background-color: rgba(var(--pm-gray-700-rgb), 0.8);
    }
    #game-overlay-message-wrapper {
      position: fixed !important;
      top: 50% !important;
      left: 50% !important;
      transform: translate(-50%, -50%) !important;
      color: rgba(var(--pm-gray-100-rgb), 0.9) !important;
      background-color: rgba(var(--pm-gray-700-rgb), 0.8);
      padding-left: 40px;
      padding-right: 40px;
      min-height: 200px;
      max-width: 500px;
      width: 90vw;
      box-sizing: border-box;
      z-index: 10000 !important;
    }
    #overlay-message-title {
      font-family: 'van dyke';
    }
    #overlay-button1,
    #overlay-button2 {
      color: rgba(var(--pm-gray-100-rgb), 0.9) !important;
    }
    .match-result-winner {
      color: var(--pm-green-300);
    }
    .match-result-loser {
      color: var(--pm-red-400);
    }
    </style>
    `;
  }

  overlayContentTemplate = {
    [OVERLAY_TYPE.PENDING]: `
      <div class="d-flex flex-column align-items-center mb-3">
        <div id="overlay-message-title" class="fs-3 px-4 pb-3">Waiting for both players to join...</div>
        <div class="pongAnimation"></div>
      </div>
      `,
    [OVERLAY_TYPE.PAUSE]: `
      <div id="overlay-message-title" class="fs-2">Game paused</div>
      <div id="overlay-message-content" class="mb-5"></div>
      <div class="d-flex flex-row align-items-center my-3">
        <div>Game will end in &nbsp</div>
        <div id="overlay-message-timer" class="fs-4 m-0"></div>
        <div>&nbspseconds</div>
      </div>
      `,
    [OVERLAY_TYPE.GAMEOVER]: `
      <div id="overlay-message-title" class="fs-2 mb-3">Game finished</div>
      <div id="overlay-game-result" class="d-flex flex-row justify-content-center align-items-center ap-3 pb-2"></div>
      <div class="d-flex flex-column mt-4">
        <button id="overlay-button1" class="btn fw-bold">Find another duel</button>
        <button id="overlay-button2" class="btn fw-bold">Back to Saloon</button>
      </div>
    `,
    [OVERLAY_TYPE.CANCEL]: `
      <div id="overlay-message-title" class="fs-2">Game canceled</div>
      <div id="overlay-message-content" class="mb-3">Player failed to connect.</div>
      <div class="d-flex flex-column mt-5">
        <button id="overlay-button1" class="btn fw-bold">Bring me another rival</button>
        <button id="overlay-button2" class="btn fw-bold">Back to Saloon</button>
      </div>
    `,
    [OVERLAY_TYPE.ERROR]: `
      <div id="overlay-message-title" class="fs-2 text-danger mb-3"></div>
      <div id="overlay-message-content" class="mb-4"></div>
      <div class="d-flex flex-column mt-3" id="error-buttons">
      </div>
    `,
  };

  playerResultTemplate() {
    return `
    <div class="d-flex flex-column justify-content-center align-items-center mx-4 p-3">
      <div class="match-result fs-5 fw-bold pb-2"></div>
      <img class="avatar-l rounded-circle mb-2" />
      <div class="overlay-player-name fs-4"></div>
      <div class="overlay-player-elo d-flex flex-row ps-2">
        <p class="game-elo m-0 fw-bold pe-1"></p>
        <i class="bi"></i>
        <p class="game-elo-change m-0 ps-2"></p>
      </div>
    </div>
  `;
  }
}

customElements.define('game-overlay', GameOverlay);
