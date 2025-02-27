import { router } from '@router';

export class DualButton extends HTMLElement {
  constructor() {
    super();
    this.handleClick = this.handleClick.bind(this);
  }

  connectedCallback() {
    this.render();
  }

  disconnectedCallback() {
    this.button.removeEventListener('click', this.handleClick);
  }

  render() {
    this.innerHTML = this.template();

    this.button = this.querySelector('#home-dual-button');
    this.button.addEventListener('click', this.handleClick);
  }

  handleClick(event) {
    event.preventDefault();
    router.navigate('/dual-menu');
  }

  template() {
    return `
	    <div id="home-dual-button">
	      <div class="btn btn-primary btn-lg">Dual</div>
	    </div>
	  `;
  }
}

customElements.define('home-dual-button', DualButton);
