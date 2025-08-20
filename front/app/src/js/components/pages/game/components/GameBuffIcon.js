import iconLarge from '/img/large.png?url';
import iconLong from '/img/long.png?url';
import iconShort from '/img/short.png?url';
import iconSlow from '/img/slow.png?url';
import iconSwitch from '/img/switch.png?url';

export class GameBuffIcon extends HTMLElement {
  #navbarHeight = 64;

  constructor() {
    super();

    this.iconWrapper = null;
    this.icon = null;

    const navbar = document.querySelector('.navbar');
    if (navbar) {
      this.#navbarHeight = navbar.offsetHeight;
    }
  }

  connectedCallback() {
    this.render();
  }

  showIcon(type) {
    if (this.icon) {
      switch (type) {
        case 'large':
          this.icon.src = iconLarge;
          break;
        case 'long':
          this.icon.src = iconLong;
          break;
        case 'short':
          this.icon.src = iconShort;
          break;
        case 'slow':
          this.icon.src = iconSlow;
          break;
        case 'switch':
          this.icon.src = iconSwitch;
          break;
        default:
          break;
      }
    }
    this.iconWrapper.classList.remove('d-none');

    // TEST
    setTimeout(() => {
      this.hideIcon();
    }, 2000);
  }

  hideIcon() {
    this.iconWrapper.classList.add('pop');
    setTimeout(() => {
      this.iconWrapper.classList.add('d-none');
      this.icon.src = '';
    }, 700);
  }

  render() {
    this.innerHTML = this.style() + this.template();
    this.iconWrapper = this.querySelector('#game-buffer-icon-wrapper');
    this.icon = this.querySelector('#game-buffer-icon');
  }

  template() {
    return `
    <div id="game-buffer-icon-wrapper" class="d-flex flex-row justify-content-center align-items-center">
      <img id="game-buffer-icon" alt="Buffer"/>
    </div>
    `;
  }

  style() {
    return `
    <style>
    #game-buffer-icon-wrapper {
      position: absolute;
      top: calc(${this.#navbarHeight}px + 16px);
      right: 16px;
    }
    #game-buffer-icon {
      width: 4rem;
      height: 4rem;
    }
    </style>
    `;
  }
}

customElements.define('game-buff-icon', GameBuffIcon);
