import { router } from '@router';
import navbarBrand from '/img/sample-logo.svg?url';

export class NavbarBrand extends HTMLElement {
  constructor() {
    super();
    this.isLoggedIn = false;
  }

  connectedCallback() {
    this.render();
  }

  setLoginStatus(value) {
    console.log('<Navbar brand> Set login status: ', value);
    this.isLoggedIn = value;
    this.render();
  }

  render() {
    console.log('<Navbar brand> Logged in: ', this.isLoggedIn);
    const isLoggedIn = this.isLoggedIn;
    const href = isLoggedIn ? '/home' : '/';

    const link = document.createElement('div');
    link.classList.add('navbar-brand');
    link.href = href;

    const img = document.createElement('img');
    img.src = navbarBrand;
    img.height = 40;
    img.alt = 'transcendence';
    img.classList.add('d-inline-block', 'align-top');

    img.addEventListener('click', (event) => {
      event.preventDefault();
      history.pushState({}, '', href);
      router.navigate(href);
    });
    link.appendChild(img);
    this.innerHTML = '';
    this.appendChild(link);
  }
}

customElements.define('navbar-brand-component', NavbarBrand);
