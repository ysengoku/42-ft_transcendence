import navbarBrand from '../../../../../public/img/sample-logo.svg';

export class NavbarBrand extends HTMLElement {
	constructor() {
		super();
	}

	connectedCallback() {
		this.render();
	}

	render() {
		// Temporary solution
		const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';

		const href = isLoggedIn ? '/home' : '/';
		const link = document.createElement('a');
		link.classList.add('navbar-brand');
		link.href = href;

		const img = document.createElement('img');
		img.src = navbarBrand;
		img.height = 40;
		img.alt = 'transcendence';
		img.classList.add('d-inline-block', 'align-top');
	  
		link.appendChild(img);
		this.innerHTML = '';
		this.appendChild(link);
	}
}

customElements.define('navbar-brand-component', NavbarBrand);
