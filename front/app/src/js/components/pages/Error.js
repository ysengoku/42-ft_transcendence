import userNotFoundImage from '/img/sample404.png?url';

export class Error extends HTMLElement {
  constructor() {
    super();
    this.message = '';
    this.status = 0;
  }

  setQueryParam(param) {
    console.log('param: ', param);
    for (const [key, value] of param.entries()) {
      console.log(`${key}: ${value}`);
    }
    this.message = param.get('error');
    this.status = param.get('code');
    this.render();
  }

  render() {
    const message = this.message || 'An error occurred';
    this.innerHTML = `
      <style>
        h2 {
          font-size: 2.5rem;
        }
        .image-container {
          width: 300px;
          height: auto;
        }
      </style>
      <div class="d-flex flex-row justify-content-center align-items-stretch my-4 py-4 gap-3">
        <div class="image-container mx-2">
        <img src="${userNotFoundImage}" alt="404" class="img-fluid">
        </div>
        <div class="d-flex flex-column justify-content-around" mx-2">
          <div class="pt-6">
            <h2>Error: ${this.status}</h2>
	          <p>${message}</p>
          </div>
          <div class="pb-6">
            <a class="btn btn-primary" href="/home" role="button">Go back to Home</a>
          </div>
        </div>
      </div>
	  `;
  }
}

customElements.define('error-page', Error);
