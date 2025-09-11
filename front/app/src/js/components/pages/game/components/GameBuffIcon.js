import iconLarge from '/img/large.png?url';
import iconLong from '/img/long.png?url';
import iconShort from '/img/short.png?url';
import iconSlow from '/img/slow.png?url';
import iconSwitch from '/img/switch.png?url';

export const BUFF_TYPE = {
  LARGE: 'large',
  LONG: 'long',
  SHORT: 'short',
  SLOW: 'slow',
  SWITCH: 'switch',
};

export class GameBuffIcon extends HTMLElement {
  #state = {
    shown: false,
  };

  constructor() {
    super();

    this.iconWrapper = null;
    this.icon = null;
  }

  connectedCallback() {
    this.render();
  }

  show(type, isForOpponent = false) {
    if (this.#state.shown) {
      return;
    }
    if (this.icon) {
      switch (type) {
        case BUFF_TYPE.LARGE:
          this.icon.src = iconLarge;
          break;
        case BUFF_TYPE.LONG:
          this.icon.src = iconLong;
          break;
        case BUFF_TYPE.SHORT:
          this.icon.src = iconShort;
          break;
        case BUFF_TYPE.SLOW:
          this.icon.src = iconSlow;
          break;
        case BUFF_TYPE.SWITCH:
          this.icon.src = iconSwitch;
          break;
        default:
          break;
      }
    }
    this.iconWrapper.classList.remove('d-none');
    isForOpponent ? this.iconText.classList.remove('d-none') : this.iconText.classList.add('d-none');
    this.iconWrapper.classList.add('pop-in');
    setTimeout(() => {
      this.iconWrapper.classList.remove('pop-in');
    }, 600);
    this.#state.shown = true;
  }

  hide() {
    this.iconWrapper.classList.add('pop-out');
    setTimeout(() => {
      this.iconWrapper.classList.add('d-none');
      this.iconWrapper.classList.remove('pop-out');
      this.icon.src = '';
      this.#state.shown = false;
    }, 600);
  }

  render() {
    this.innerHTML = this.style() + this.template();
    this.iconWrapper = this.querySelector('#game-buffer-icon-wrapper');
    this.icon = this.querySelector('#game-buffer-icon');
    this.iconText = this.querySelector('#game-buffer-icon-text');
  }

  template() {
    return `
    <div id="game-buffer-icon-wrapper" class="d-flex flex-column justify-content-center align-items-center m-3 d-none">
      <img id="game-buffer-icon"alt="Buffer"/>
      <p id="game-buffer-icon-text" class="fs-6 fw-bold d-none">Opponent Debuffed</p>
    </div>
    `;
  }

  style() {
    return `
    <style>
    #game-buffer-icon-wrapper {
      position: absolute;
      top: 10px;
      right: 10px;
    }
    #game-buffer-icon {
      width: 120px;
      height: 120px;
    }
    #game-buffer-icon-text {
      color: var(--pm-primary-100);
    </style>
    `;
  }
}

customElements.define('game-buff-icon', GameBuffIcon);
