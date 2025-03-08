import { router } from '@router';
import navbarBrand from '/img/sample-logo.svg?url';

export class NavbarBrand extends HTMLElement {
  constructor() {
    super();
    this.isLoggedIn = false;
    this.handleClick = this.handleClick.bind(this);
  }

  connectedCallback() {
    this.render();
  }

  disconnectedCallback() {
    this.img?.removeEventListener('click', this.handleClick);
  }

  setLoginStatus(value) {
    this.isLoggedIn = value;
    this.render();
  }

  render() {
    this.href = this.isLoggedIn ? '/home' : '/';

    this.link = document.createElement('div');
    this.link.classList.add('navbar-brand');
    this.link.href = this.href;

    this.img = document.createElement('img');
    this.img.src = navbarBrand;
    this.img.height = 40;
    this.img.alt = 'Peacemakers';
    this.img.classList.add('d-inline-block', 'align-top');

    this.img.addEventListener('click', this.handleClick);
    this.link.appendChild(this.img);
    this.innerHTML = '';
    this.appendChild(this.link);
  }

  handleClick(event) {
    event.preventDefault();
    router.navigate(this.href);
  }
}

customElements.define('navbar-brand-component', NavbarBrand);
