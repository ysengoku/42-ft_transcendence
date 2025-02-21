export class Game extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    this.render();
  }

  render() {
    this.innerHTML = `
	  <style>
            body { margin: 0; }
            #divA {
            position: absolute;
            top: 10px;
            padding: 0px 0;
            width: 100%;
            text-align: center;
            color: white;
            z-index: 10;
            display:block;
            }
            #divB {
            position: absolute;
            top: 10px;
            padding: 20px 0;
            width: 100%;
            text-align: center;
            color: white;
            z-index: 10;
            display:block;
            }
      </style>
	  <div id="divA">P1 0 </div><div id="divB">P2 0 </div>
	  `;
  }
}

customElements.define('app-game', Game);
