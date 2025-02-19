import { router } from '@router';

export class DualButton extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    this.render();
  }

  render() {
    this.innerHTML = `
	    <div id="home-dual-button">
	      <div class="btn btn-primary btn-lg">Dual</div>
	    </div>
	    `;
    const button = this.querySelector('#home-dual-button');
    button.addEventListener('click', (event) => {
      event.preventDefault();
      router.navigate('/dual-menu');
    });
  }
}

customElements.define('home-dual-button', DualButton);
