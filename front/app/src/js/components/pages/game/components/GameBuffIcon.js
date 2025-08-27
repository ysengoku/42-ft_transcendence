import iconLarge from '/img/large.png?url';
import iconLong from '/img/long.png?url';
import iconShort from '/img/short.png?url';
import iconSlow from '/img/slow.png?url';
import iconSwitch from '/img/switch.png?url';

export class GameBuffIcon extends HTMLElement {
  constructor() {
    super();

    this.iconWrapper = null;
    this.icon = null;
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
    this.iconWrapper.classList.add('pop-in');
    setTimeout(() => {
      this.iconWrapper.classList.remove('pop-in');
    }, 600);
  }

  hideIcon() {
    this.iconWrapper.classList.add('pop-out');
    setTimeout(() => {
      this.iconWrapper.classList.add('d-none');
      this.iconWrapper.classList.remove('pop-out');
      this.icon.src = '';
    }, 600);
  }

  render() {
    this.innerHTML = this.style() + this.template();
    this.iconWrapper = this.querySelector('#game-buffer-icon-wrapper');
    this.icon = this.querySelector('#game-buffer-icon');
  }

  template() {
    return `
    <div id="game-buffer-icon-wrapper" class="d-flex flex-row justify-content-center align-items-center m-3">
      <img id="game-buffer-icon" alt="Buffer"/>
    </div>
    `;
  }

  style() {
    return `
    <style>
    #game-buffer-icon-wrapper {
      position: absolute;
      top: 88px;
      right: 88px;
    }
    #game-buffer-icon {
      width: 120px;
      height: 120px;
    }
    </style>
    `;
  }
}

customElements.define('game-buff-icon', GameBuffIcon);
