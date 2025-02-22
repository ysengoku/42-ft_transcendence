export class Error extends HTMLElement {
  constructor() {
    super();
    this.message = '';
    this.status = 0;
  }

  //   connectedCallback() {
  //     this.render();
  //   }

  setParam(param) {
    this.message = param.message;
    this.status = param.status;
    this.render();
  }

  ender() {
    this.innerHTML = `
	  <div>
	    <h1>Error ${this.status}</h1>
	    <p>${this.message}</p>
	  `;
  }
}

customElements.define('error-page', Error);
