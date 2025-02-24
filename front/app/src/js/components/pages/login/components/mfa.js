import { getCSRFTokenfromCookies } from '../../../../auth/csrfToken.js';

export class MFAAuth extends HTMLElement {
}

customElements.define('mfa-auth', MFAAuth);
